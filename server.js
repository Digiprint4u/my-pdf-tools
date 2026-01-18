const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = "uploads";
const outputDir = "outputs";

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

/* ================= MULTER CONFIG ================= */
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.includes("pdf")) {
      return cb(new Error("Only PDF files allowed"));
    }
    cb(null, true);
  }
});

/* ================= UTIL ================= */
function cleanFiles(input, output) {
  if (fs.existsSync(input)) fs.unlinkSync(input);
  if (fs.existsSync(output)) fs.unlinkSync(output);
}

function runCmd(cmd, input, output, res) {
  exec(cmd, { timeout: 120000 }, err => {
    if (err) {
      cleanFiles(input, output);
      return res.status(500).json({ error: "Processing failed / timeout" });
    }
    res.download(output, () => cleanFiles(input, output));
  });
}

/* ================= HEALTH CHECK ================= */
app.get("/health", (req, res) => {
  res.json({ status: "OK", version: "PDF PRO v1.0" });
});

/* ================= PDF COMPRESS ================= */
app.post("/compress", upload.single("file"), (req, res) => {
  const level = req.body.level || "ebook"; // screen | ebook | printer
  const input = req.file.path;
  const output = path.join(outputDir, `${uuid()}.pdf`);

  const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
  -dPDFSETTINGS=/${level} -dNOPAUSE -dQUIET -dBATCH \
  -sOutputFile=${output} ${input}`;

  runCmd(cmd, input, output, res);
});

/* ================= OCR ================= */
app.post("/ocr", upload.single("file"), (req, res) => {
  const input = req.file.path;
  const outputBase = path.join(outputDir, uuid());
  const output = outputBase + ".pdf";

  const cmd = `tesseract ${input} ${outputBase} pdf`;

  runCmd(cmd, input, output, res);
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("PDF PRO Backend running on port " + PORT)
);
