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
app.use(express.static(path.join(__dirname))); // Frontend ফাইলগুলো সার্ভ করার জন্য

// ফোল্ডার তৈরি
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR);

const upload = multer({ dest: 'uploads/' });

// মূল পাতায় গেলে index.html দেখাবে
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// PDF to Word
app.post('/pdf-to-word', upload.single('file'), (req, res) => {
  const input = req.file.path;
  const outputFileName = `${req.file.filename}.docx`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  exec(`libreoffice --headless --convert-to docx ${input} --outdir ${OUTPUTS_DIR}`, (err) => {
    if (err) return res.status(500).json({ error: 'Conversion failed' });
    res.download(outputPath, () => {
      cleanup([input, outputPath]);
    });
  });
});

// Compress PDF
app.post('/compress', upload.single('file'), (req, res) => {
  const input = req.file.path;
  const output = path.join(OUTPUTS_DIR, `${uuid()}.pdf`);
  exec(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${output} ${input}`, (err) => {
    if (err) return res.status(500).json({ error: 'Compression failed' });
    res.download(output, () => cleanup([input, output]));
  });
});

// OCR
app.post('/ocr', upload.single('file'), (req, res) => {
  const input = req.file.path;
  const outputBase = path.join(OUTPUTS_DIR, uuid());
  exec(`tesseract ${input} ${outputBase} pdf`, (err) => {
    if (err) return res.status(500).json({ error: 'OCR failed' });
    const finalPath = `${outputBase}.pdf`;
    res.download(finalPath, () => cleanup([input, finalPath]));
  });
});

function cleanup(files) {
  files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
