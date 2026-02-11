// ===============================
// 📤 Upload e criação de sessão
// ===============================

async function uploadPdfFile(file) {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Erro ao enviar PDF: ${file.name}`);
  }

  return res.json();
}

function normalizarComunicadosComId(comunicados, prefixo) {
  return (comunicados || []).map((c, idx) => ({
    ...c,
    id: `${prefixo}-${idx + 1}`,
  }));
}

const processamentoEl = document.getElementById('processingStatus');
const processamentoTextoEl = document.getElementById('processingText');
const processamentoEtaEl = document.getElementById('processingEta');
const processamentoBarraEl = document.getElementById('processingBarFill');
const aiRuntimeBadgeEl = document.getElementById('aiRuntimeBadge');

function formatarDuracao(ms) {
  const totalSegundos = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSegundos / 60);
  const seg = totalSegundos % 60;
  if (min <= 0) return `${seg}s`;
  if (seg === 0) return `${min}min`;
  return `${min}min ${seg}s`;
}

function atualizarBarraProcessamento({ visivel, texto, eta, progresso }) {
  if (!processamentoEl) return;

  processamentoEl.style.display = 'block';

  if (!visivel) {
    if (processamentoTextoEl) processamentoTextoEl.textContent = 'Aguardando upload de PDF';
    if (processamentoEtaEl) processamentoEtaEl.textContent = 'Estimativa: --';
    if (processamentoBarraEl) processamentoBarraEl.style.width = '0%';
    return;
  }

  if (processamentoTextoEl && texto) processamentoTextoEl.textContent = texto;
  if (processamentoEtaEl && eta) processamentoEtaEl.textContent = eta;

  if (processamentoBarraEl) {
    const pct = Math.max(0, Math.min(100, Number(progresso || 0)));
    processamentoBarraEl.style.width = `${pct}%`;
  }
}

function atualizarIndicadorIA(aiAtivo, model = 'qwen2.5:3b-instruct-q4_K_M') {
  if (!aiRuntimeBadgeEl) return;

  aiRuntimeBadgeEl.classList.remove('ai-on', 'ai-off', 'ai-unknown');
  if (aiAtivo === true) {
    aiRuntimeBadgeEl.classList.add('ai-on');
    aiRuntimeBadgeEl.textContent = `IA ON (${model})`;
    return;
  }

  if (aiAtivo === false) {
    aiRuntimeBadgeEl.classList.add('ai-off');
    aiRuntimeBadgeEl.textContent = `IA OFF (${model})`;
    return;
  }

  aiRuntimeBadgeEl.classList.add('ai-unknown');
  aiRuntimeBadgeEl.textContent = 'IA: verificando...';
}

async function atualizarStatusIARealtime() {
  try {
    const res = await fetch('/ai-status');
    if (!res.ok) throw new Error('Falha ao consultar IA');
    const data = await res.json();
    atualizarIndicadorIA(!!data.aiAtivo, data.model || 'qwen2.5:3b-instruct-q4_K_M');
  } catch {
    atualizarIndicadorIA(false, 'qwen2.5:3b-instruct-q4_K_M');
  }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  console.log('Form submit iniciado');
  const sid = sessionSelect.value;
  const files = Array.from(fileInput.files || []);

  if (sid && files.length === 0) {
    console.log('Carregando sessão existente:', sid);
    loadSession(sid);
    return;
  }

  if (files.length === 0) {
    alert('Selecione ao menos um PDF.');
    return;
  }

  try {
    console.log(`Fazendo upload de ${files.length} PDF(s)...`);
    const inicioLote = Date.now();
    const mediaHistoricaMs = Number(localStorage.getItem('upload_media_pdf_ms') || 0);
    const estimativaInicialMs = mediaHistoricaMs > 0 ? mediaHistoricaMs * files.length : 120000 * files.length;

    atualizarBarraProcessamento({
      visivel: true,
      texto: `Iniciando processamento de ${files.length} PDF(s)...`,
      eta: `Estimativa: ${formatarDuracao(estimativaInicialMs)}`,
      progresso: 2,
    });
    await atualizarStatusIARealtime();

    const loteComunicados = [];
    const loteErros = [];
    let ultimoProblemas = null;
    let aiAtivo = false;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const progressoInicioArquivo = Math.round((i / files.length) * 100);
      atualizarBarraProcessamento({
        visivel: true,
        texto: `Processando PDF ${i + 1}/${files.length}: ${file.name}`,
        eta: i === 0 ? 'Estimativa: calculando...' : processamentoEtaEl?.textContent || 'Estimativa: --',
        progresso: Math.max(4, progressoInicioArquivo),
      });

      const { comunicados, erros, problemas, aiAtivo: aiDoArquivo } =
        await uploadPdfFile(file);

      const baseId = `${Date.now()}-${i + 1}`;
      const comunicadosComId = normalizarComunicadosComId(comunicados, baseId);

      loteComunicados.push(...comunicadosComId);
      loteErros.push(...(erros || []));
      ultimoProblemas = problemas || ultimoProblemas;
      aiAtivo = aiAtivo || !!aiDoArquivo;

      const decorridoMs = Date.now() - inicioLote;
      const concluidos = i + 1;
      const mediaAtualMs = decorridoMs / concluidos;
      const restanteMs = mediaAtualMs * (files.length - concluidos);
      const progressoFimArquivo = Math.round((concluidos / files.length) * 100);

      atualizarBarraProcessamento({
        visivel: true,
        texto: `PDF ${concluidos}/${files.length} concluído`,
        eta: `Estimativa restante: ${formatarDuracao(restanteMs)}`,
        progresso: Math.min(95, progressoFimArquivo),
      });
      atualizarIndicadorIA(!!aiDoArquivo);
    }

    if (sid) {
      const sess = await apiLoadSession(sid);
      if (!sess) {
        alert('Sessão não encontrada para adicionar novos PDFs.');
        return;
      }

      const existentes = (sess.payload?.comunicados || []).map((c, idx) => ({
        ...c,
        id: c.id ?? `existente-${idx + 1}`,
      }));

      const comunicadosMesclados = [...existentes, ...loteComunicados];
      const errosMesclados = [...(sess.payload?.erros || []), ...loteErros];
      const completos = sess.payload?.completos || [];

      renderComunicados(
        comunicadosMesclados,
        errosMesclados,
        new Set(completos),
        ultimoProblemas,
        aiAtivo
      );

      await saveSession(sid, sess.label, {
        comunicados: comunicadosMesclados,
        erros: errosMesclados,
        completos,
      });

      await populateSessionSelect();
      currentSessionId = sid;
      sessionSelect.value = sid;
      await loadSession(sid);

      alert(
        `Adicionados ${loteComunicados.length} comunicado(s) em ${files.length} PDF(s) na sessão atual.`
      );
    } else {
      const completos = new Set();
      renderComunicados(
        loteComunicados,
        loteErros,
        completos,
        ultimoProblemas,
        aiAtivo
      );

      const labelBase =
        files.length === 1
          ? files[0].name
          : `${files.length} PDFs (${new Date().toLocaleDateString()})`;
      const newId = Date.now().toString();

      await saveSession(newId, labelBase, {
        comunicados: loteComunicados,
        erros: loteErros,
        completos: [],
      });

      await populateSessionSelect();
      currentSessionId = newId;
      sessionSelect.value = newId;
      await loadSession(newId);
    }

    const duracaoTotalMs = Date.now() - inicioLote;
    const mediaFinalMs = Math.round(duracaoTotalMs / files.length);
    localStorage.setItem('upload_media_pdf_ms', String(mediaFinalMs));

    atualizarBarraProcessamento({
      visivel: true,
      texto: `Concluído: ${loteComunicados.length} comunicado(s) processado(s)`,
      eta: `Tempo total: ${formatarDuracao(duracaoTotalMs)}`,
      progresso: 100,
    });
    atualizarIndicadorIA(aiAtivo);
    fileInput.value = '';

    setTimeout(() => {
      atualizarBarraProcessamento({ visivel: false, texto: '', eta: '', progresso: 0 });
    }, 1800);
  } catch (error) {
    console.error(error);
    atualizarBarraProcessamento({
      visivel: true,
      texto: 'Falha no processamento dos PDFs',
      eta: 'Verifique o arquivo e tente novamente.',
      progresso: 100,
    });
    alert(error.message || 'Erro ao processar os PDFs.');
  } finally {
    await atualizarStatusIARealtime();
  }
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

  const comunicados = cards.map(div => {
    const parte1El = div.querySelector('.content-editable');
    const parte2El = div.querySelector('.parte2');
    
    const parte1 = parte1El ? parte1El.textContent.trim() : '';
    const parte2 = parte2El ? parte2El.textContent.trim() : '';
    
    return {
      texto: parte1 && parte2 ? `${parte1}\n\n${parte2}` : (parte1 || parte2)
    };
  });

  try {
    const response = await fetch('/gerar-etiquetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comunicados }),
    });

    if (!response.ok) throw new Error('Erro ao gerar PDF');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Nome do arquivo: etiquetas + data + hora + quantidade
    const agora = new Date();
    const data = agora.toISOString().slice(0, 10).replace(/-/g, '');
    const hora = agora.toTimeString().slice(0, 5).replace(/:/g, '');
    const qtd = comunicados.length;
    const nomeArquivo = `etiquetas-${data}-${hora}-${qtd}itens.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
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
    const parte1El = div.querySelector('.content-editable');
    const parte2El = div.querySelector('.parte2');
    
    const parte1 = parte1El ? parte1El.textContent.trim() : '';
    const parte2 = parte2El ? parte2El.textContent.trim() : '';
    
    return {
      texto: parte1 && parte2 ? `${parte1}\n\n${parte2}` : (parte1 || parte2)
    };
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
      
      // Nome do arquivo: etiquetas + data + hora + quantidade
      const agora = new Date();
      const data = agora.toISOString().slice(0, 10).replace(/-/g, '');
      const hora = agora.toTimeString().slice(0, 5).replace(/:/g, '');
      const qtd = comunicados.length;
      const nomeArquivo = `etiquetas-${data}-${hora}-${qtd}itens.pdf`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
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
// 💾 EXPORTAR JSON
// ===============================
document.getElementById('exportarJSON')?.addEventListener('click', async () => {
  if (!currentSessionId) {
    alert("Nenhuma sessão carregada.");
    return;
  }

  const sess = await apiLoadSession(currentSessionId);
  const comunicados = sess?.payload?.comunicados || [];
  
  if (!comunicados.length) {
    alert("Nenhum comunicado para exportar.");
    return;
  }

  try {
    const res = await fetch('/exportar-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comunicados })
    });
    
    if (!res.ok) throw new Error('Erro ao exportar JSON');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comunicados_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert(`JSON exportado com sucesso! ${comunicados.length} comunicados.`);
  } catch (error) {
    console.error('Erro ao exportar JSON:', error);
    alert('Erro ao exportar JSON: ' + error.message);
  }
});


// ===============================
// 🔄 Inicialização
// ===============================

populateSessionSelect();
atualizarBarraProcessamento({ visivel: false, texto: '', eta: '', progresso: 0 });
atualizarStatusIARealtime();
setInterval(atualizarStatusIARealtime, 30000);
