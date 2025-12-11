// ===============================
// 🔵 API de Sessão com SQLite
// ===============================


async function apiListSessions(opts = {}) {
  const params = new URLSearchParams();

  // mais pra frente dá pra usar opts.archived, etc.
  if (opts.archived !== undefined) {
    params.set('archived', String(opts.archived));
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch('/sessions' + query);
  return await r.json();
}

async function apiLoadSession(id) {
  const r = await fetch(`/session/${id}`);
  if (!r.ok) return null;
  return await r.json();
}

async function apiSaveSession(id, label, payload) {
  await fetch(`/session/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, payload }),
  });
}

async function apiRenameSession(id, newLabel) {
  const r = await fetch(`/session/${id}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: newLabel }),
  });
  if (!r.ok) throw new Error('Erro ao renomear sessão');
  return await r.json(); // espera { id, label }
}

async function apiToggleArchiveSession(id) {
  const r = await fetch(`/session/${id}/archive`, {
    method: 'PATCH',
  });
  if (!r.ok) throw new Error('Erro ao arquivar sessão');
  return await r.json(); // espera { id, label }
}


// ===============================
// 🔵 Sessões (select / salvar)
// ===============================

async function populateSessionSelect() {
  // limpa as duas listas
  sessionSelect.innerHTML = '<option value="">Nova Sessão</option>';
  archivedSessionSelect.innerHTML =
    '<option value="">Nenhuma sessão arquivada</option>';

  // busca todas no backend
  const sessions = await apiListSessions();

  sessions.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;

    // tira o prefixo [ARQ] só pra ficar mais limpo visualmente
    const cleanLabel = s.label.replace(/^\[ARQ\]\s*/, '');
    option.textContent = cleanLabel;

    // se tiver data no label, vira tooltip
    const match = s.label.match(/\((\d{2}\/\d{2}\/\d{4})\)/);
    if (match) {
      option.title = `Criado em: ${match[1]}`;
    }

    if (s.label.startsWith('[ARQ]')) {
      // vai para o select de arquivados
      archivedSessionSelect.appendChild(option);
    } else {
      // fica no select principal
      sessionSelect.appendChild(option);
    }
  });
}



async function saveSession(id, label, data) {
  await apiSaveSession(id, label, data);
  populateSessionSelect();
}

function clearUI() {
  container.innerHTML = '';
  resumoEl.innerHTML = '';
  listaNomes.innerHTML = '';
  currentSessionId = null;
}
