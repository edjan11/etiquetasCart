// ===============================
// 📌 Dependências
// ===============================
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdf = require("pdf-parse");
const { processarTexto } = require("./src/parser/processarTexto");
const gerarEtiqueta = require("./src/exporter/gerarEtiquetaCasamento");
const { gerarEtiquetasPDF } = require("./src/exporter/etiquetas");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "comunicados.db");
const db = new Database(dbPath);

const app = express();
const upload = multer({ dest: "uploads/" });


app.use(express.json({ limit: "10mb" }));

// Log básico
app.use((req, res, next) => {
  console.log("🔥 REQ:", req.method, req.url);
  next();
});

// ===============================
// 📌 Página principal
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// ===============================
// 📌 Upload PDF → Processar comunicados
// ===============================
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);
    const { text } = await pdf(buffer);
    fs.unlinkSync(req.file.path);

    const { resultados, relatorio } = processarTexto(text);

    const comunicadosComEtiqueta = resultados.map((c) => ({
      ...c,
      ...gerarEtiqueta(c),
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

// ===============================
// 📌 Gerar PDF final de etiquetas
// ===============================
app.post("/gerar-etiquetas", async (req, res) => {
  try {
    const comunicados = req.body.comunicados;
    if (!Array.isArray(comunicados) || comunicados.length === 0) {
      return res.status(400).json({ error: "Array de comunicados inválido." });
    }

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

// ===============================
// 📌 Banco SQLite + Tabela
// ===============================


db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    payload TEXT NOT NULL,
    archived INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ✅ MIGRAÇÃO: adicionar coluna archived se não existir
const cols = db.prepare(`PRAGMA table_info(sessions)`).all();
const hasArchived = cols.some(c => c.name === "archived");

if (!hasArchived) {
  db.exec(`ALTER TABLE sessions ADD COLUMN archived INTEGER DEFAULT 0;`);
}



// ===============================
// 📌 Salvar sessão
// ===============================
app.post("/session/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { label, payload } = req.body;
    const json = JSON.stringify(payload);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (id, label, payload)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        payload = excluded.payload,
        updatedAt = ?
    `).run(id, label, json, now);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar sessão." });
  }
});

// ===============================
// 📌 Carregar sessão
// ===============================
app.get("/session/:id", (req, res) => {
  try {
    const id = req.params.id;

    const row = db.prepare(`
      SELECT id, label, payload, archived, createdAt, updatedAt
      FROM sessions
      WHERE id = ?
    `).get(id);

    if (!row) return res.json(null);

    let payload = {};
    try { payload = JSON.parse(row.payload); } catch {}

    res.json({
      id: row.id,
      label: row.label,
      archived: !!row.archived,
      payload,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao carregar sessão." });
  }
});

// ===============================
// 📌 Listar sessões
// ===============================
app.get("/sessions", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, label, archived, updatedAt
      FROM sessions
      ORDER BY updatedAt DESC
    `).all();

    return res.json(rows);

  } catch (err) {
    console.error("ERRO SQL /sessions:", err);
    return res.status(500).json({
      error: "Erro ao listar sessões.",
      details: String(err?.message || err),
      dbPath,
    });
  }
});


// ===============================
// 📌 Renomear sessão
// ===============================
app.patch("/session/:id/rename", (req, res) => {
  try {
    const id = req.params.id;
    const { label } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ error: "Label inválido" });
    }

    const now = new Date().toISOString();

    const info = db.prepare(`
      UPDATE sessions
      SET label = ?, updatedAt = ?
      WHERE id = ?
    `).run(label.trim(), now, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }

    res.json({ id, label: label.trim() });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao renomear sessão." });
  }
});

// ===============================
// 📌 Arquivar / Desarquivar sessão
// ===============================
app.patch("/session/:id/archive", (req, res) => {
  try {
    const id = req.params.id;

    const row = db.prepare("SELECT label FROM sessions WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }

    let newLabel;
    if (row.label.startsWith("[ARQ] ")) {
      newLabel = row.label.replace("[ARQ] ", "");
    } else {
      newLabel = "[ARQ] " + row.label;
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE sessions
      SET label = ?, updatedAt = ?
      WHERE id = ?
    `).run(newLabel, now, id);

    res.json({ id, label: newLabel });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao arquivar sessão." });
  }
});

// ===============================
// 📌 Excluir sessão
// ===============================
app.post("/session/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { label, payload } = req.body;

    if (!label) throw new Error("label veio vazio/undefined");
    const json = JSON.stringify(payload ?? {}); // <- impede NULL
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sessions (id, label, payload, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        payload = excluded.payload,
        updatedAt = excluded.updatedAt
    `).run(id, label, json, now);

    return res.json({ ok: true });

  } catch (err) {
    console.error("ERRO SQL /session/:id:", err);
    return res.status(500).json({
      error: "Erro ao salvar sessão.",
      details: String(err?.message || err),
      body: req.body,
      dbPath,
    });
  }
});



// ===============================
// 📌 Arquivos estáticos
// ===============================
app.use(express.static(path.join(__dirname, "views")));



// ===============================
// 📌 Inicializar servidor
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
