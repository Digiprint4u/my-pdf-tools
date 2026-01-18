const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuid } = require('uuid');


const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);


const upload = multer({ dest: 'uploads/' });


app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});


// PDF ➜ Word
app.post('/pdf-to-word', upload.single('file'), (req, res) => {
const input = req.file.path;
const output = path.join(outputDir, `${req.file.filename}.docx`);


exec(`libreoffice --headless --convert-to docx ${input} --outdir ${outputDir}`, err => {
if (err) return res.status(500).send('Conversion failed');
res.download(output, () => {
fs.unlinkSync(input);
fs.unlinkSync(output);
});
});
});


// Compress PDF
app.post('/compress', upload.single('file'), (req, res) => {
const input = req.file.path;
const output = path.join(outputDir, `${uuid()}.pdf`);


exec(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${output} ${input}`, err => {
if (err) return res.status(500).send('Compression failed');
res.download(output, () => {
fs.unlinkSync(input);
fs.unlinkSync(output);
});
});
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
