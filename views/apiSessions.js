// ======================================================
// 🔵 API de Sessão (Frontend) — Consistente e Organizado
// ======================================================

// Lista sessões
async function apiListSessions(opts = {}) {
  const params = new URLSearchParams();
  if (opts.archived !== undefined) params.set("archived", String(opts.archived));

  const r = await fetch("/sessions" + (params.toString() ? `?${params}` : ""));
  if (!r.ok) throw new Error("Erro ao listar sessões");
  return await r.json();
}

// Carrega sessão pelo ID
async function apiLoadSession(id) {
  const r = await fetch(`/session/${id}`);
  if (!r.ok) return null;
  return await r.json(); // { id, label, payload, archived, ... }
}

// Salvar sessão
async function apiSaveSession(id, label, payload) {
  const r = await fetch(`/session/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, payload }),
  });

  if (!r.ok) throw new Error("Erro ao salvar sessão");
  return await r.json();
}

// Renomear sessão
async function apiRenameSession(id, newLabel) {
  const r = await fetch(`/session/${id}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: newLabel }),
  });

  if (!r.ok) throw new Error("Erro ao renomear sessão");
  return await r.json();
}

// Arquivar / Desarquivar
async function apiToggleArchiveSession(id) {
  const r = await fetch(`/session/${id}/archive`, { method: "PATCH" });

  if (!r.ok) throw new Error("Erro ao arquivar sessão");
  return await r.json();
}

// Excluir sessão
async function apiDeleteSession(id) {
  const r = await fetch(`/session/${id}`, { method: "DELETE" });

  if (!r.ok) throw new Error("Erro ao excluir sessão");
  return await r.json();
}



// ======================================================
// 🔵 Lógica de Sessões (UI)
// ======================================================

async function loadSession(id) {
  clearUI();

  const sess = await apiLoadSession(id);
  if (!sess) {
    alert("Sessão não encontrada.");
    return;
  }

  currentSessionId = id;

  // mantém padrão do escrevente
  escrevente = sess.payload?.escrevente || "Edjan Santos Melo";
  if (escreventeSelect) escreventeSelect.value = escrevente;

  const comunicados = sess.payload?.comunicados || [];

  // chama seu renderizador normal
  renderComunicados(comunicados, sess.payload.erros, new Set(sess.payload.completos || []));
}


async function populateSessionSelect() {
  sessionSelect.innerHTML = '<option value="">Nova Sessão</option>';
  archivedSessionSelect.innerHTML = '<option value="">Nenhuma sessão arquivada</option>';

  const sessions = await apiListSessions();

  sessions.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label.replace(/^\[ARQ\]\s*/, "");
    opt.title = s.updatedAt || "";

    if (s.label.startsWith("[ARQ]")) {
      archivedSessionSelect.appendChild(opt);
    } else {
      sessionSelect.appendChild(opt);
    }
  });
}

// Salvar sessão e recarregar selects
async function saveSession(id, label, data) {
  await apiSaveSession(id, label, data);
  await populateSessionSelect();
}

// Limpa interface
function clearUI() {
  container.innerHTML = "";
  resumoEl.innerHTML = "";
  listaNomes.innerHTML = "";
  currentSessionId = null;
}
