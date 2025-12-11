// ===============================
// 🔵 Carregar sessão
// ===============================

async function loadSession(id) {
  clearUI();

  const sess = await apiLoadSession(id);
  if (!sess) {
    alert('Sessão não encontrada.');
    return;
  }

  currentSessionId = id;

  const rawComunicados = sess.payload.comunicados || [];
  const comunicados = rawComunicados.map((c, idx) => ({
    ...c,
    id: c.id ?? String(idx + 1),
  }));

  const erros = sess.payload.erros || [];
  const completos = sess.payload.completos || [];

  // normaliza também o array de completos para string
  const completosSet = new Set(completos.map(x => String(x)));

  renderComunicados(comunicados, erros, completosSet);

  // sobrescreve no payload em memória com ids normalizados
  sess.payload.comunicados = comunicados;
  await apiSaveSession(id, sess.label, sess.payload);
}

// ===============================
// 🔵 Concluir / persistência
// ===============================

function toggleConcluido(div, id, btn) {
  const done = div.classList.contains('completed');

  // só mexe no DOM
  div.classList.toggle('completed', !done);
  btn.textContent = done ? '✅ Concluir' : '🔄 Desmarcar';

  filtrar();

  // e salva no banco
  if (currentSessionId) {
    persistSession();
  }
}

// ===============================
// 💾 Persistência da sessão (SQLite)
// ===============================

async function persistSession() {
  if (!currentSessionId) return;

  // pega os concluídos direto do DOM
  const completos = Array.from(
    document.querySelectorAll('.comunicado.completed')
  ).map(div => div.dataset.id);

  const sess = await apiLoadSession(currentSessionId);
  if (!sess) return;

  const payload = {
    comunicados: [],
    erros: sess.payload.erros || [],
    completos
  };

  payload.comunicados = (sess.payload.comunicados || []).map(orig => {
    const div = container.querySelector(`[data-id="${orig.id}"]`);
    if (!div) return orig;

    const newParte1 =
      div.querySelector('.content-editable')?.innerHTML || orig.parte1;
    const newParte2 =
      div.querySelector('.parte2')?.innerText.trim() || orig.parte2;

    const newErros = (orig.erros || []).filter(err => {
      if (err === 'Cartório de origem ausente')
        return !newParte2.includes('Cartório de origem:');
      return true;
    });

    return {
      ...orig,
      parte1: newParte1,
      parte2: newParte2,
      erros: newErros,
    };
  });

  await apiSaveSession(currentSessionId, sess.label, payload);
}
