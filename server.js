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
app.use(express.static(__dirname));

const upload = multer({ dest: "uploads/" });

/* ================= PDF TO WORD ================= */
app.post("/pdf-to-word", upload.single("file"), (req,res)=>{
  const input=req.file.path;
  const out=path.join("outputs",`${uuid()}.docx`);
  exec(`libreoffice --headless --convert-to docx ${input} --outdir outputs`,()=>{
    res.download(out,()=>{fs.unlinkSync(input);fs.unlinkSync(out);});
  });
});

/* ================= COMPRESS ================= */
app.post("/compress", upload.single("file"), (req,res)=>{
  const level=req.body.level || "ebook";
  const input=req.file.path;
  const output=`outputs/${uuid()}.pdf`;

  exec(`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/${level} -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${output} ${input}`,
  ()=>{
    res.download(output,()=>{fs.unlinkSync(input);fs.unlinkSync(output);});
  });
});

/* ================= OCR ================= */
app.post("/ocr", upload.single("file"), (req,res)=>{
  const lang=req.body.lang || "eng";
  const dpi=req.body.quality==="high"?300:150;
  const input=req.file.path;
  const outBase=`outputs/${uuid()}`;
  const out=`${outBase}.pdf`;

  exec(`tesseract ${input} ${outBase} -l ${lang} --dpi ${dpi} pdf`,()=>{
    res.download(out,()=>{fs.unlinkSync(input);fs.unlinkSync(out);});
  });
});

app.listen(3000,()=>console.log("PDF Magic PRO running"));
