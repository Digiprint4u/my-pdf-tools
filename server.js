const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuid } = require('uuid');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ১. প্রয়োজনীয় ফোল্ডার তৈরি (uploads এবং outputs)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR);

// ২. Multer সেটিংস: ফাইল আপলোড করার জন্য
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = uuid() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // সর্বোচ্চ ৫০ মেগাবাইট
});

// ৩. হেলথ চেক রুট
app.get('/', (req, res) => {
  res.json({ status: 'PDF Tools API is running', version: '1.0.0' });
});

/* ==========================================
   ৪. PDF → WORD (LibreOffice ব্যবহার করে)
========================================== */
app.post('/pdf-to-word', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const outputFileName = req.file.filename.replace(path.extname(req.file.filename), '.docx');
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  // LibreOffice কমান্ড
  const command = `libreoffice --headless --convert-to docx "${inputPath}" --outdir "${OUTPUTS_DIR}"`;

  exec(command, (err) => {
    if (err) {
      console.error('Conversion Error:', err);
      return res.status(500).json({ error: 'PDF to Word conversion failed' });
    }

    res.download(outputPath, (downloadErr) => {
      // ফাইল পাঠানোর পর সার্ভার থেকে ডিলিট করে দেওয়া
      cleanupFiles([inputPath, outputPath]);
    });
  });
});

/* ==========================================
   ৫. PDF COMPRESS (Ghostscript ব্যবহার করে)
========================================== */
app.post('/compress', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const outputPath = path.join(OUTPUTS_DIR, `compressed-${uuid()}.pdf`);

  // Ghostscript কমান্ড
  const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

  exec(command, (err) => {
    if (err) return res.status(500).json({ error: 'Compression failed' });

    res.download(outputPath, () => {
      cleanupFiles([inputPath, outputPath]);
    });
  });
});

/* ==========================================
   ৬. OCR PDF (Tesseract OCR ব্যবহার করে)
========================================== */
app.post('/ocr', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const outputBaseName = path.join(OUTPUTS_DIR, uuid()); // Tesseract অটোমেটিক .pdf যোগ করে
  const finalOutputPath = `${outputBaseName}.pdf`;

  // Tesseract কমান্ড
  const command = `tesseract "${inputPath}" "${outputBaseName}" pdf`;

  exec(command, (err) => {
    if (err) return res.status(500).json({ error: 'OCR processing failed' });

    res.download(finalOutputPath, () => {
      cleanupFiles([inputPath, finalOutputPath]);
    });
  });
});

/* ==========================================
   ৭. PDF UNLOCK (qpdf ব্যবহার করে)
========================================== */
app.post('/unlock', upload.single('file'), (req, res) => {
  const password = req.body.password;
  if (!req.file || !password) return res.status(400).json({ error: 'File and password are required' });

  const inputPath = req.file.path;
  const outputPath = path.join(OUTPUTS_DIR, `unlocked-${uuid()}.pdf`);

  const command = `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`;

  exec(command, (err) => {
    if (err) return res.status(500).json({ error: 'Wrong password or unlocking failed' });

    res.download(outputPath, () => {
      cleanupFiles([inputPath, outputPath]);
    });
  });
});

// ৮. ফাইল ক্লিনআপ ফাংশন (সার্ভারের জায়গা বাঁচানোর জন্য)
function cleanupFiles(files) {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlink(file, (err) => {
        if (err) console.error('Cleanup Error:', err);
      });
    }
  });
}

// ৯. পোর্ট কনফিগারেশন
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PDF Pro Server running on port ${PORT}`);
});