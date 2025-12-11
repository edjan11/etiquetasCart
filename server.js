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


app.use((req, res, next) => {
  console.log("🔥 REQ:", req.method, req.url);
  next();
});

app.use(express.json({ limit: "10mb" })); // ou até mais se necessário

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

// ===========================================
// 🔵 Persistência em Banco (SQLite)
// ===========================================
const Database = require("better-sqlite3");
const db = new Database("comunicados.db");

// Cria tabela caso não exista
db.prepare(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    label TEXT,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`).run();

// ===============================
// 🔵 Salvar sessão
// ===============================
app.post("/session/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { label, payload } = req.body;
    const now = new Date().toISOString();
    const json = JSON.stringify(payload);

    db.prepare(`
      INSERT INTO sessions (id, label, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(id, label, json, now);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar sessão." });
  }
});

// ===============================
// 🔵 Carregar sessão
// ===============================
app.get("/session/:id", (req, res) => {
  try {
    const id = req.params.id;
    const row = db.prepare("SELECT data, label FROM sessions WHERE id = ?").get(id);
    if (!row) return res.json(null);

    res.json({
      label: row.label,
      payload: JSON.parse(row.data)
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar sessão." });
  }
});

// ===============================
// 🔵 Listar sessões (para o select)
// ===============================
app.get("/sessions", (req, res) => {
  try {
    const rows = db.prepare("SELECT id, label FROM sessions ORDER BY updated_at DESC").all();
    res.json(rows);
  } catch (err) {
    console.error("ERRO SQL /sessions:", err);
    res.status(500).json({ error: "Erro ao listar sessões." });
  }
});

// Renomear sessão (better-sqlite3)
app.patch('/session/:id/rename', (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'Label inválido' });
  }

  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      UPDATE sessions
      SET label = ?, updated_at = ?
      WHERE id = ?
    `);

    const info = stmt.run(label.trim(), now, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    return res.json({ id, label: label.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao renomear sessão' });
  }
});

// Arquivar / desarquivar sessão (better-sqlite3)
app.patch('/session/:id/archive', (req, res) => {
  const { id } = req.params;

  try {
    const row = db
      .prepare('SELECT label FROM sessions WHERE id = ?')
      .get(id);

    if (!row) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    let newLabel;
    if (row.label.startsWith('[ARQ] ')) {
      // desarquivar
      newLabel = row.label.replace(/^\[ARQ\]\s*/, '');
    } else {
      // arquivar
      newLabel = `[ARQ] ${row.label}`;
    }

    const now = new Date().toISOString();

    const info = db
      .prepare(`
        UPDATE sessions
        SET label = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(newLabel, now, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada ao arquivar' });
    }

    return res.json({ id, label: newLabel });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao arquivar sessão' });
  }
});


app.use(express.static(path.join(__dirname, "views")));



app.listen(3000, () => {
  console.log("✅ Acesse: http://localhost:3000");
});
