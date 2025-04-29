const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdf = require("pdf-parse");
const { processarTexto } = require("./src/parser/processarTexto");
const gerarEtiqueta = require("./src/exporter/gerarEtiquetaCasamento");
const PDFDocument = require("pdfkit");
const { gerarEtiquetasPDF } = require("./src/exporter/etiquetas");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(path.join(__dirname, "views")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdf(buffer);
    fs.unlinkSync(req.file.path);

    const { resultados, relatorio } = processarTexto(text);

    const comunicadosComEtiqueta = resultados.map((comunicado) => ({
      ...comunicado,
      ...gerarEtiqueta(comunicado),
    }));

    res.json({
      comunicados: comunicadosComEtiqueta,
      erros: relatorio,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao processar PDF" });
  }
});

app.post("/gerar-etiquetas", async (req, res) => {
  const comunicados = req.body.comunicados;

  if (!Array.isArray(comunicados) || comunicados.length === 0) {
    return res.status(400).json({ error: "Array de comunicados inválido." });
  }

  try {
    const textos = comunicados.map((c) => c.texto);
    const buffer = await gerarEtiquetasPDF(textos);

    res.setHeader("Content-Disposition", "attachment; filename=etiquetas.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar PDF." });
  }
});

app.listen(3000, () => {
  console.log("✅ Acesse: http://localhost:3000");
});
