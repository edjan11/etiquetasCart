// ===============================
// 📤 Upload e criação de sessão
// ===============================

form.addEventListener('submit', async e => {
  e.preventDefault();
  const sid = sessionSelect.value;

  if (sid && !fileInput.files.length) {
    loadSession(sid);
    return;
  }

  const res = await fetch('/upload', {
    method: 'POST',
    body: new FormData(form),
  });
  if (!res.ok) return alert('Erro ao enviar PDF.');

  const { comunicados, erros } = await res.json();

  // garante id estável para cada comunicado
  const comunicadosComId = (comunicados || []).map((c, idx) => ({
    ...c,
    id: c.id ?? String(idx + 1),
  }));

  const completos = new Set();
  renderComunicados(comunicadosComId, erros, completos);

  const label = `${fileInput.files[0].name} (${new Date().toLocaleDateString()})`;
  const newId = Date.now().toString();

  await saveSession(newId, label, {
    comunicados: comunicadosComId,
    erros,
    completos: [],
  });
  // 🔥 ESSENCIAL
  await populateSessionSelect();

  // agora sim o option existe
  currentSessionId = newId;
  sessionSelect.value = newId;

  await loadSession(newId);

  // opcional, mas coerente
  fileInput.disabled = true;
});

// ===============================
// 🎛 Controles de UI
// ===============================

loadBtn.addEventListener('click', () => {
  const id = sessionSelect.value;
  if (!id) return alert('Selecione uma sessão primeiro.');
  loadSession(id);
});

// carregar sessão arquivada
loadArchivedBtn.addEventListener('click', () => {
  const id = archivedSessionSelect.value;
  if (!id) {
    alert('Selecione uma sessão arquivada.');
    return;
  }

  loadSession(id);
  // só pra não ficar marcando algo no select principal
  sessionSelect.value = '';
});


escreventeSelect.addEventListener('change', e => {
  escrevente = e.target.value;
});

filtroBtn.addEventListener('click', () => {
  pendentesOnly = !pendentesOnly;
  filtroBtn.textContent = pendentesOnly
    ? 'Mostrar todos'
    : 'Mostrar só pendentes';
  filtrar();
});

busca.addEventListener('input', filtrar);

// ===============================
// 📄 Exportar etiquetas em PDF
// ===============================

exportarPDFBtn.addEventListener('click', async () => {
  await persistSession();
  const cards = [...container.children].filter(
    div => div.style.display !== 'none'
  );

  const comunicados = cards.map(div => ({
    texto: `${div.querySelector('.content-editable')?.innerText.trim() ||
      ''}\n\n${div
      .querySelector('.parte2')
      ?.innerText.trim() || ''}`,
  }));

  try {
    const response = await fetch('/gerar-etiquetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comunicados }),
    });

    if (!response.ok) throw new Error('Erro ao gerar PDF');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'etiquetas.pdf';
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('Erro ao gerar etiquetas');
  }
});



// ===============================
// 📝 Renomear sessão selecionada
// ===============================

const btnRenomearSessao = document.getElementById('btnRenomearSessao');
btnRenomearSessao.addEventListener('click', async () => {
  const id = sessionSelect.value;
  if (!id) {
    alert('Selecione uma sessão para renomear.');
    return;
  }

  const currentOption = sessionSelect.options[sessionSelect.selectedIndex];
  const currentLabel = currentOption.textContent;

  const novoNome = prompt('Novo nome para esta sessão:', currentLabel);
  if (!novoNome || !novoNome.trim()) return;

  try {
    const result = await apiRenameSession(id, novoNome.trim());
    // recarrega a lista para refletir o novo nome
    await populateSessionSelect();
    sessionSelect.value = result.id;
  } catch (err) {
    console.error(err);
    alert('Erro ao renomear sessão.');
  }
});

const btnExcluirArquivada = document.getElementById('btnExcluirArquivada');

btnExcluirArquivada.addEventListener('click', async () => {
  const id = archivedSessionSelect.value;

  if (!id) {
    alert("Selecione uma sessão arquivada para excluir.");
    return;
  }

  if (!confirm("Tem certeza? Essa sessão será excluída DEFINITIVAMENTE.")) {
    return;
  }

  try {
    await apiDeleteSession(id);
    await populateSessionSelect(); // recarrega listas
    archivedSessionSelect.value = "";
    alert("Sessão excluída com sucesso.");
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir sessão.");
  }
});


// ===============================
// 🗄️ Arquivar sessão selecionada
// ===============================

const btnArquivarSessao = document.getElementById('btnArquivarSessao');
btnArquivarSessao.addEventListener('click', async () => {
  const id = sessionSelect.value;
  if (!id) {
    alert('Selecione uma sessão para arquivar.');
    return;
  }

  const currentOption = sessionSelect.options[sessionSelect.selectedIndex];
  const isArchived = currentOption.textContent.startsWith('[ARQ]');

  const confirmMsg = isArchived
    ? 'Deseja remover esta sessão dos arquivados?'
    : 'Deseja arquivar esta sessão? Ela continuará disponível no sistema, mas ficará marcada.';

  if (!confirm(confirmMsg)) return;

  try {
    const result = await apiToggleArchiveSession(id);
    await populateSessionSelect();
    sessionSelect.value = result.id;
  } catch (err) {
    console.error(err);
    alert('Erro ao arquivar/desarquivar sessão.');
  }
});


// versão alternativa usada por algum botão manual, se existir
function gerarEtiquetas() {
  const cards = [...container.children].filter(
    d => d.style.display !== 'none'
  );

  const comunicados = cards.map(div => {
    const parte1 = div.querySelector('.content-editable')?.innerText || '';
    const parte2 = div.querySelector('.parte2')?.innerText || '';
    return (parte1 + '\n\n' + parte2).trim();
  });

  fetch('/gerar-etiquetas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comunicados }),
  })
    .then(r => {
      if (!r.ok) throw new Error();
      return r.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'etiquetas.pdf';
      a.click();
    })
    .catch(() => alert('Erro ao gerar etiquetas.'));
}

// ===============================
// 🎯 Foco em comunicado
// ===============================

function focusComunicado(id) {
  const el = document.querySelector(`.comunicado[data-id="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 2000);
}

// ===============================
// 📄 Relatório TXT (pendentes)
// ===============================
exportarRelatorioTxtBtn.addEventListener('click', async () => {
  // garante que o estado atual da tela foi salvo na sessão
  await persistSession();

  if (!currentSessionId) {
    alert("Nenhuma sessão carregada.");
    return;
  }

  const sess = await apiLoadSession(currentSessionId);
  const comunicados = sess?.payload?.comunicados || [];

  // pendente = ainda não tem "Cartório de origem:" no texto
  const pendentes = comunicados.filter(c =>
    !/Cartório de origem:/i.test(c.parte2 || "")
  );

  const pendCasamento = [];
  const pendNascimento = [];

  pendentes.forEach(c => {
    const tipo = inferirTipoComunicado(c); // já existe em renderComunicados.js
    if (tipo === "NASCIMENTO") pendNascimento.push(c);
    else pendCasamento.push(c);
  });

  // gera TXT no teu formato atual (R:, P:, P2:, L/F/T etc.)
  exportPendentesTxt(pendCasamento, pendNascimento);
});


// ===============================
// 🔄 Inicialização
// ===============================

populateSessionSelect();
