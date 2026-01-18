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
app.use(express.static(__dirname)); // Frontend ফাইল দেখানোর জন্য

// ফোল্ডার তৈরি
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// PDF to Word
app.post('/pdf-to-word', upload.single('file'), (req, res) => {
    console.log("PDF to Word Request Received");
    const input = req.file.path;
    const outputFileName = `${req.file.filename}.docx`;
    const outputPath = path.join(outputDir, outputFileName);

    exec(`libreoffice --headless --convert-to docx ${input} --outdir ${outputDir}`, (err) => {
        if (err) {
            console.error("LibreOffice Error:", err);
            return res.status(500).json({ error: 'Conversion failed' });
        }
        res.download(outputPath, () => {
            if (fs.existsSync(input)) fs.unlinkSync(input);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    });
});

// Compress PDF
app.post('/compress', upload.single('file'), (req, res) => {
    console.log("Compress Request Received");
    const input = req.file.path;
    const output = path.join(outputDir, `${uuid()}.pdf`);
    exec(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${output} ${input}`, (err) => {
        if (err) return res.status(500).json({ error: 'Compression failed' });
        res.download(output, () => {
            if (fs.existsSync(input)) fs.unlinkSync(input);
            if (fs.existsSync(output)) fs.unlinkSync(output);
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
