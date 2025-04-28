const cores = getComputedStyle(document.documentElement).getPropertyValue('--colors')
  .split(',').map(c => c.trim());
const TTL = 10 * 24 * 60 * 60 * 1000;
let currentSessionId = null;
let escrevente = '';
let pendentesOnly = false;

const form = document.getElementById('formUpload');
const fileInput = document.getElementById('fileInput');
const sessionSelect = document.getElementById('sessionSelect');
const loadBtn = document.getElementById('btnCarregarSessao');
const escreventeSelect = document.getElementById('escreventeSelect');
const busca = document.getElementById('buscaComunicados');
const filtroBtn = document.getElementById('filtroPendentes');
const container = document.getElementById('resultados');
const resumoEl = document.getElementById('resumoErros');
const listaNomes = document.getElementById('listaNomes');

// tema persistente
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeToggle.textContent = '☀';
}
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀' : '☾';
});

function pruneSessions() {
  const now = Date.now();
  const all = JSON.parse(localStorage.getItem('sessions') || '[]');
  const valid = all.filter(s => now - s.timestamp < TTL);
  all.filter(s => now - s.timestamp >= TTL)
    .forEach(s => localStorage.removeItem('session_' + s.id));
  localStorage.setItem('sessions', JSON.stringify(valid));
  return valid;
}

function populateSessionSelect() {
  sessionSelect.innerHTML = '<option value="">Nova Sessão</option>';
  pruneSessions().forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.label;
    sessionSelect.appendChild(o);
  });
}

function saveSession(id, label, data) {
  const now = Date.now();
  const list = pruneSessions();
  list.push({ id, label, timestamp: now });
  localStorage.setItem('sessions', JSON.stringify(list));
  localStorage.setItem('session_' + id, JSON.stringify(data));
  populateSessionSelect();
}

function clearUI() {
  container.innerHTML = '';
  resumoEl.innerHTML = '';
  listaNomes.innerHTML = '';
  currentSessionId = null;
}
function renderComunicados(comunicados, erros, completosSet) {
    // 1) limpa container e sidebar
    container.innerHTML = '';
    listaNomes.innerHTML = '';
  
    // 2) Monta a LISTA LATERAL: só pendentes de cartório
    comunicados
      .filter(com => com.erros.includes('Cartório de origem ausente') && com.nome_registrado)
      .forEach(com => {
        const nomeCard = document.createElement('div');
        nomeCard.className = 'conjuge-card';
        nomeCard.innerHTML = `
          <strong>${com.nome_registrado}</strong>
          <div class="botoes-cartorio" style="margin: 8px 0;">
            ${[6,12,13,14,15].map(n => `
              <button
                data-id="${com.id}"
                data-cartorio="${n}"
                onclick="definirCartorio(this)"
              >${n}</button>
            `).join('')}
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-copiar"
                    onclick="navigator.clipboard.writeText('${com.nome_registrado}')">
              📋 Copiar Nome
            </button>
            <button class="btn-copiar"
                    onclick="focusComunicado('${com.id}')">
              🔍 Ir para
            </button>
          </div>
        `;
        listaNomes.appendChild(nomeCard);
      });
  
    // 3) Reseta o resumo de erros
    resumoEl.innerHTML = '';
  
    // 4) Monta o container principal com TODOS os comunicados
    comunicados.forEach((com, i) => {
      const div = document.createElement('div');
      div.className = 'comunicado';
      div.dataset.id = com.id;
      if (completosSet.has(com.id)) div.classList.add('completed');
      div.style.borderLeftColor = cores[i % cores.length];
  
      // badge de status
      const num = document.createElement('span');
      num.className = 'numero';
      num.textContent = `#${i+1}`;
      const badge = document.createElement('span');
      const preenchido = /Cartório de origem:/.test(com.parte2);
      badge.className = 'badge ' + (preenchido ? 'concluido' : 'pendente');
      badge.textContent = preenchido ? 'Concluído' : 'Pendente';
      num.after(badge);
      div.appendChild(num);
  
      // parte1 editável
      const p1 = document.createElement('div');
      p1.className = 'content-editable';
      p1.contentEditable = 'false';
      p1.innerHTML = `${com.parte1}${escrevente ? ` Dou fé, ${escrevente}.` : ''}`;
      p1.addEventListener('blur', () => {
        if (p1.contentEditable === 'true') {
          p1.contentEditable = 'false';
          persistSession();
        }
      });
      div.appendChild(p1);
  
      // parte2
      const p2 = document.createElement('div');
      p2.className = 'parte2';
      p2.textContent = com.parte2;
      div.appendChild(p2);
  
      // botões de ação
      const grp = document.createElement('div');
      grp.className = 'btn-group';
  
      // editar texto
      const btE = document.createElement('button');
      btE.textContent = '📝 Editar';
      btE.onclick = () => {
        const ed = p1.contentEditable === 'true';
        p1.contentEditable = ed ? 'false' : 'true';
        if (!ed) p1.focus(); else persistSession();
      };
      grp.appendChild(btE);
  
      // concluir/desmarcar
      const btC = document.createElement('button');
      btC.textContent = completosSet.has(com.id) ? '🔄 Desmarcar' : '✅ Concluir';
      btC.onclick = () => toggleConcluido(div, com.id, btC);
      grp.appendChild(btC);
  
      // se ainda não tem cartório, exibe o input
      if (com.erros.includes('Cartório de origem ausente')) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'input-cartorio';
        inp.placeholder = 'Ex: 13º Ofício';
  
        const btA = document.createElement('button');
        btA.textContent = '➕ Cartório';
        btA.onclick = () => {
          adicionarCartorio(btA);
          persistSession();
        };
  
        const btCp = document.createElement('button');
        btCp.textContent = '📋 Nome';
        btCp.onclick = e => copiarNome(e, com.nome_registrado);
  
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            adicionarCartorio(btA);
          }
        });
  
        grp.append(inp, btA, btCp);
      }
  
      div.appendChild(grp);
  
      // exibe erros de parsing
      if (com.erros.length) {
        const erdiv = document.createElement('div');
        erdiv.className = 'erros';
        erdiv.textContent = '⚠️ ' + com.erros.join(', ');
        div.appendChild(erdiv);
      }
  
      container.appendChild(div);
    });
  
    // 5) resumo-final de erros gerais
    if (erros.length) {
      resumoEl.innerHTML = `
        <div class="resumo-erros">
          <strong>${erros.length} erro(s):</strong><br>
          ${erros.map(e => `#${e.id}: ${e.erros.join(', ')}`).join('<br>')}
        </div>
      `;
    }
  
    // 6) aplica o filtro de busca/pendentes
    filtrar();
  }
  
  
  
function loadSession(id) {
  clearUI();
  fileInput.disabled = true;
  fileInput.value = '';
  const raw = localStorage.getItem('session_' + id);
  if (!raw) return;
  const sess = JSON.parse(raw);
  renderComunicados(sess.comunicados, sess.erros, new Set(sess.completos));
  currentSessionId = id;
}

function carregarCompletos() {
  return JSON.parse(localStorage.getItem('completos') || '[]');
}

function salvarCompletos(list) {
  localStorage.setItem('completos', JSON.stringify(list));
}

function toggleConcluido(div, id, btn) {
  const lista = carregarCompletos();
  const idx = lista.indexOf(id);
  const done = idx > -1;
  if (done) lista.splice(idx, 1); else lista.push(id);
  salvarCompletos(lista);
  div.classList.toggle('completed', !done);
  btn.textContent = done ? '✅ Concluir' : '🔄 Desmarcar';
  filtrar();
  if (currentSessionId) {
    const sess = JSON.parse(localStorage.getItem('session_' + currentSessionId));
    sess.completos = lista;
    localStorage.setItem('session_' + currentSessionId, JSON.stringify(sess));
  }
}

function copiarNome(e, nome) {
  const btn = e.target;
  if (!nome) {
    btn.textContent = '❌ Nome não encontrado';
    btn.disabled = true;
    return setTimeout(() => {
      btn.textContent = '📋 Nome'; btn.disabled = false;
    }, 2000);
  }
  navigator.clipboard.writeText(nome).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ Copiado!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = orig; btn.disabled = false;
    }, 2000);
  });
}

function adicionarCartorio(btn) {
  const inp = btn.parentElement.querySelector('.input-cartorio');
  const v = inp.value.trim();
  if (!v) return alert('Preencha o cartório.');
  const card = btn.closest('.comunicado');
  const p2 = card.querySelector('.parte2');
  if (!/Cartório de origem:/.test(p2.textContent))
    p2.textContent += `\nCartório de origem: ${v}`;
  else
    p2.textContent = p2.textContent.replace(
      /Cartório de origem:[^\n]*/,
      `Cartório de origem: ${v}`
    );
  card.querySelector('.erros')?.remove();
  btn.textContent = '✏️ Editar cartório';
  btn.onclick = () => editarCartorio(btn, v);
}

function editarCartorio(btn, old) {
  const cont = btn.parentElement;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.value = old; inp.className = 'input-cartorio';
  const sv = document.createElement('button');
  sv.textContent = '✅ Salvar';
  sv.onclick = () => salvarCartorio(sv, inp.value, old);
  cont.insertBefore(inp, btn);
  cont.insertBefore(sv, btn);
  btn.remove();
}

function salvarCartorio(btn, nw, old) {
  const card = btn.closest('.comunicado');
  const p2 = card.querySelector('.parte2');
  p2.textContent = p2.textContent.replace(
    `Cartório de origem: ${old}`,
    `Cartório de origem: ${nw}`
  );
  const cont = btn.parentElement;
  cont.querySelectorAll('.input-cartorio').forEach(x => x.remove());
  btn.remove();
  const ed = document.createElement('button');
  ed.textContent = '✏️ Editar cartório';
  ed.onclick = () => editarCartorio(ed, nw);
  cont.appendChild(ed);
}

function definirCartorio(botao) {
    const id = botao.dataset.id;
    const cartorio = botao.dataset.cartorio;
  
    const comunicado = document.querySelector(`.comunicado[data-id="${id}"]`);
    if (!comunicado) return;
  
    const parte2 = comunicado.querySelector('.parte2');
    if (!parte2) return;
  
    if (!/Cartório de origem:/.test(parte2.textContent)) {
      parte2.textContent += `\nCartório de origem: ${cartorio}º Ofício`;
    } else {
      parte2.textContent = parte2.textContent.replace(
        /Cartório de origem:[^\n]*/,
        `Cartório de origem: ${cartorio}º Ofício`
      );
    }
  
    // Atualizar botão visualmente: remover dos outros e adicionar no clicado
    const containerBotoes = botao.parentElement;
    containerBotoes.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
    botao.classList.add('selected');
  
    persistSession();
  }
  
  

function preencherCartorioLista(e, id) {
  if (e.key !== 'Enter') return;
  const cartorio = e.target.value.trim();
  if (!cartorio) return alert('Digite o cartório e pressione ENTER.');
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return alert('Comunicado não encontrado.');
  const parte2 = card.querySelector('.parte2');
  if (!/Cartório de origem:/.test(parte2.textContent)) {
    parte2.textContent += `\nCartório de origem: ${cartorio}`;
  } else {
    parte2.textContent = parte2.textContent.replace(
      /Cartório de origem:[^\n]*/,
      `Cartório de origem: ${cartorio}`
    );
  }
  persistSession();
  e.target.value = '';
}

function copiarTexto(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    alert('Nome copiado!');
  });
}

function filtrar() {
  const q = busca.value.toLowerCase();
  document.querySelectorAll('.comunicado').forEach(div => {
    const txt = div.textContent.toLowerCase();
    const done = div.classList.contains('completed');
    div.style.display = (txt.includes(q) && (!pendentesOnly || !done)) ? '' : 'none';
  });
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const sid = sessionSelect.value;
  if (sid && !fileInput.files.length) {
    loadSession(sid);
    return;
  }
  const res = await fetch('/upload', { method: 'POST', body: new FormData(form) });
  if (!res.ok) return alert('Erro ao enviar PDF.');
  const { comunicados, erros } = await res.json();
  const completos = new Set(carregarCompletos());
  renderComunicados(comunicados, erros, completos);
  const label = `${fileInput.files[0].name} (${new Date().toLocaleDateString()})`;
  const newId = Date.now().toString();
  saveSession(newId, label, {
    comunicados,
    erros,
    completos: Array.from(completos)
  });
  currentSessionId = newId;
  sessionSelect.value = newId;
  fileInput.disabled = true;
});

loadBtn.addEventListener('click', () => {
  const id = sessionSelect.value;
  if (!id) return alert('Selecione uma sessão primeiro.');
  loadSession(id);
});

escreventeSelect.addEventListener('change', e => escrevente = e.target.value);
filtroBtn.addEventListener('click', () => {
  pendentesOnly = !pendentesOnly;
  filtroBtn.textContent = pendentesOnly ? 'Mostrar todos' : 'Mostrar só pendentes';
  filtrar();
});
busca.addEventListener('input', filtrar);

function persistSession() {
  if (!currentSessionId) return;
  const key = 'session_' + currentSessionId;
  const sess = JSON.parse(localStorage.getItem(key));
  sess.comunicados = sess.comunicados.map(orig => {
    const div = container.querySelector(`[data-id="${orig.id}"]`);
    if (!div) return orig;
    const newParte1 = div.querySelector('.content-editable').innerHTML;
    const newParte2 = div.querySelector('.parte2').textContent.trim();
    const newErros = orig.erros.filter(err => {
      if (err === 'Cartório de origem ausente')
        return !newParte2.includes('Cartório de origem:');
      return true;
    });
    return { ...orig, parte1: newParte1, parte2: newParte2, erros: newErros };
  });
  localStorage.setItem(key, JSON.stringify(sess));
}

populateSessionSelect();

const toggleListaNomes = document.getElementById('toggleListaNomes');
const listaConjuges = document.getElementById('listaConjuges');

toggleListaNomes.addEventListener('click', () => {
  if (listaConjuges.style.display === 'none') {
    listaConjuges.style.display = 'block';
  } else {
    listaConjuges.style.display = 'none';
  }
});


document.getElementById('exportarPDF').addEventListener('click', async () => {
    const cards = [...document.getElementById('resultados').children]
      .filter(div => div.style.display !== 'none');
  
    const comunicados = cards.map(div => ({
      texto: `${div.querySelector('.content-editable')?.innerText.trim() || ''}\n\n${div.querySelector('.parte2')?.innerText.trim() || ''}`
    }));
  
    try {
      const response = await fetch('/gerar-etiquetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comunicados })
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
  
function gerarEtiquetas() {
    const cards = [...container.children].filter(d => d.style.display !== 'none');
  
    const comunicados = cards.map(div => ({
      texto: `${div.querySelector('.content-editable')?.innerText.trim() || ''}\n\n${div.querySelector('.parte2')?.innerText.trim() || ''}`
    }));
  
    fetch('/gerar-etiquetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comunicados })
    })
    .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'etiquetas.pdf';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Erro ao gerar etiquetas.'));
  }  ;
  

  function gerarEtiquetas() {
    const cards = [...container.children].filter(d => d.style.display !== 'none');
  
    const comunicados = cards.map(div => {
      const parte1 = div.querySelector('.content-editable')?.innerText || '';
      const parte2 = div.querySelector('.parte2')?.innerText || '';
      return (parte1 + '\n\n' + parte2).trim();
    });
  
    fetch('/gerar-etiquetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comunicados })
    })
    .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'etiquetas.pdf';
      a.click();
    })
    .catch(() => alert('Erro ao gerar etiquetas.'));
  }

  function focusComunicado(id) {
    const el = document.querySelector(`.comunicado[data-id="${id}"]`);
    if (!el) return;
    // rola suavemente até o card
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // destaque temporário
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 2000);
  }
  
  