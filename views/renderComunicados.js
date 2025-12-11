// ===============================
// 🔵 Renderização dos comunicados
// ===============================

function renderComunicados(comunicados, erros, completosSet) {
  container.innerHTML = '';
  listaNomes.innerHTML = '';
  resumoEl.innerHTML = '';

  // lista lateral (somente quem está sem cartório)
  const pendentesSemCartorio = comunicados.filter(
    com =>
      com.erros?.includes('Cartório de origem ausente') &&
      com.nome_registrado
  );

  // separa em casamento x nascimento (heurística)
  const pendCasamento = [];
  const pendNascimento = [];

  pendentesSemCartorio.forEach(com => {
    const tipo = inferirTipoComunicado(com);
    if (tipo === 'NASCIMENTO') pendNascimento.push(com);
    else pendCasamento.push(com);
  });

  // header da lista lateral + botão TXT
  if (pendentesSemCartorio.length) {
    const header = document.createElement('div');
    header.className = 'lista-header';
    header.innerHTML = `
      <span>Pendências de cartório (${pendentesSemCartorio.length})</span>
      <button type="button" class="btn-copiar" id="btnExportPendentes">
        ⬇ TXT pendentes
      </button>
    `;
    listaNomes.appendChild(header);
  }

  function adicionaSecaoLateral(titulo, lista) {
    if (!lista.length) return;

    const tituloEl = document.createElement('div');
    tituloEl.className = 'lista-titulo';
    tituloEl.textContent = titulo;
    listaNomes.appendChild(tituloEl);

    lista.forEach(com => {
      const nomeCard = document.createElement('div');
      nomeCard.className = 'conjuge-card';
      nomeCard.innerHTML = `
        <strong>${com.nome_registrado}</strong>
        <div class="botoes-cartorio" style="margin: 8px 0;">
          ${[6, 12, 13, 14, 15]
            .map(
              n => `
            <button
              data-id="${com.id}"
              data-cartorio="${n}"
              onclick="definirCartorio(this)"
            >${n}</button>
          `
            )
            .join('')}
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
  }

  adicionaSecaoLateral('Casamento', pendCasamento);
  adicionaSecaoLateral('Nascimento', pendNascimento);

  // liga o botão de exportar TXT (se existir)
  const btnExport = document.getElementById('btnExportPendentes');
  if (btnExport) {
    btnExport.onclick = () =>
      exportPendentesTxt(pendCasamento, pendNascimento);
  }


  comunicados.forEach((com, i) => {
    const div = document.createElement('div');
    div.className = 'comunicado';
    div.dataset.id = com.id; // id AGORA é sempre string
    if (completosSet.has(com.id)) div.classList.add('completed');
    div.style.borderLeftColor = cores[i % cores.length];

    const num = document.createElement('span');
    num.className = 'numero';
    num.textContent = `#${i + 1}`;
    const badge = document.createElement('span');
    const preenchido = /Cartório de origem:/.test(com.parte2 || '');
    badge.className = 'badge ' + (preenchido ? 'concluido' : 'pendente');
    badge.textContent = preenchido ? 'Concluído' : 'Pendente';
    num.after(badge);
    div.appendChild(num);

    const p1 = document.createElement('div');
    p1.className = 'content-editable';
    p1.contentEditable = 'false';
    p1.innerHTML = `${com.parte1 || ''}${
      escrevente ? ` Dou fé, ${escrevente}.` : ''
    }`;
    p1.addEventListener('blur', () => {
      if (p1.contentEditable === 'true') {
        p1.contentEditable = 'false';
        persistSession();
      }
    });
    div.appendChild(p1);

    const p2 = document.createElement('div');
    p2.className = 'parte2';
    p2.textContent = com.parte2 || '';
    div.appendChild(p2);

    const grp = document.createElement('div');
    grp.className = 'btn-group';

    const btE = document.createElement('button');
    btE.textContent = '📝 Editar';
    btE.onclick = () => {
      const ed = p1.contentEditable === 'true';
      p1.contentEditable = ed ? 'false' : 'true';
      if (!ed) p1.focus();
      else persistSession();
    };
    grp.appendChild(btE);

    const btC = document.createElement('button');
    btC.textContent = completosSet.has(com.id)
      ? '🔄 Desmarcar'
      : '✅ Concluir';
    btC.onclick = () => toggleConcluido(div, com.id, btC);
    grp.appendChild(btC);

    if (com.erros?.includes('Cartório de origem ausente')) {
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

    if (com.erros?.length) {
      const erdiv = document.createElement('div');
      erdiv.className = 'erros';
      erdiv.textContent = '⚠️ ' + com.erros.join(', ');
      div.appendChild(erdiv);
    }

    container.appendChild(div);
  });

  if (erros && erros.length) {
    resumoEl.innerHTML = `
      <div class="resumo-erros">
        <strong>${erros.length} erro(s):</strong><br>
        ${erros.map(e => `#${e.id}: ${e.erros.join(', ')}`).join('<br>')}
      </div>
    `;
  }

  filtrar();
}

// ===============================
// 🔧 Utilitários de cartório / cópia
// ===============================

function copiarNome(e, nome) {
  const btn = e.target;
  if (!nome) {
    btn.textContent = '❌ Nome não encontrado';
    btn.disabled = true;
    return setTimeout(() => {
      btn.textContent = '📋 Nome';
      btn.disabled = false;
    }, 2000);
  }
  navigator.clipboard.writeText(nome).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ Copiado!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled = false;
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
  persistSession();
}

function editarCartorio(btn, old) {
  const cont = btn.parentElement;
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = old;
  inp.className = 'input-cartorio';
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
  persistSession();
}

function definirCartorio(botao) {
  const id = botao.dataset.id;
  const cartorio = botao.dataset.cartorio;

  const comunicado = document.querySelector(
    `.comunicado[data-id="${id}"]`
  );
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

  const containerBotoes = botao.parentElement;
  containerBotoes
    .querySelectorAll('button')
    .forEach(btn => btn.classList.remove('selected-cartorio'));
  botao.classList.add('selected-cartorio');

  persistSession();
}

// ===============================
// 📌 Inferir tipo do comunicado
// ===============================
function inferirTipoComunicado(com) {
  // se um dia você colocar com.tipo no parser, usamos direto
  if (com.tipo) {
    const t = String(com.tipo).toLowerCase();
    if (t.includes('nasc')) return 'NASCIMENTO';
    if (t.includes('cas')) return 'CASAMENTO';
  }

  const base = `${com.texto || ''}\n${com.parte2 || ''}`.toLowerCase();

  if (base.includes('nascimento registrado')) return 'NASCIMENTO';
  if (base.includes('certidão de nascimento')) return 'NASCIMENTO';

  // default: a maioria é casamento
  return 'CASAMENTO';
}

function splitPais(paisRaw) {
  if (!paisRaw) return { p1: '', p2: '' };

  const texto = String(paisRaw).trim();
  if (!texto) return { p1: '', p2: '' };

  const idx = texto.toLowerCase().indexOf(' e ');
  if (idx === -1) {
    // não achou " e " -> tudo em P, P2 vazio
    return { p1: texto, p2: '' };
  }

  const p1 = texto.slice(0, idx).trim();
  const p2 = texto.slice(idx + 3).trim(); // pula " e "

  return { p1, p2 };
}


// ===============================
// ⬇ Exportar TXT com pendentes
// ===============================
function exportPendentesTxt(pendCasamento, pendNascimento) {
  const linhas = [];

  function adicionarSecao(titulo, lista) {
    if (!lista.length) return;

    linhas.push(`=== ${titulo} ===`);

    lista.forEach(com => {
      const { p1, p2 } = splitPais(com.pais || '');

      linhas.push(`R: ${com.nome_registrado || ''}`);

      if (p1) {
        linhas.push(`P: ${p1}`);
      }

      if (p2) {
        linhas.push(`P2: ${p2}`);
      }

      const L = com.livro_origem || '';
      const F = com.folha_origem || '';
      const T = com.termo_origem || '';

      if (L || F || T) {
        linhas.push(`L: ${L}  F: ${F}  T: ${T}`);
      }

      linhas.push(''); // separador entre registros
    });

    linhas.push(''); // linha em branco entre seções
  }

  adicionarSecao('CASAMENTO', pendCasamento);
  adicionarSecao('NASCIMENTO', pendNascimento);

  if (!linhas.length) {
    alert('Nenhuma pendência de cartório para exportar.');
    return;
  }

  const blob = new Blob([linhas.join('\n')], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const hoje = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `pendentes-cartorio-${hoje}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

// ===============================
// 🔎 Filtros
// ===============================

function filtrar() {
  const q = busca.value.toLowerCase();
  document.querySelectorAll('.comunicado').forEach(div => {
    const txt = div.textContent.toLowerCase();
    const done = div.classList.contains('completed');
    div.style.display =
      txt.includes(q) && (!pendentesOnly || !done) ? '' : 'none';
  });
}

// ===============================
// 🧹 Limpar e deduplicar nomes
// ===============================
function limparNomeBruto(nomeBruto) {
  if (!nomeBruto) return null;

  let nome = String(nomeBruto)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // lixo comum que aparece no PDF e não é nome de ninguém
  const STOPWORDS = new Set([
    'MAT',
    'S',
    'A',
    'O MESMO',
    'NAO ALTEROU',
    'NÃO ALTEROU',
    'NADA CONSTA',
  ]);

  // muito curto ou só uma palavra -> provavelmente não é nome
  if (nome.length < 8) return null;
  if (!nome.includes(' ')) return null;
  if (STOPWORDS.has(nome)) return null;

  return nome;
}

function normalizarChaveNome(nome) {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();
}

function deduplicarENormalizar(listaBruta) {
  const vistos = new Set();
  const limpos = [];

  for (const bruto of listaBruta) {
    const nome = limparNomeBruto(bruto);
    if (!nome) continue;

    const chave = normalizarChaveNome(nome);
    if (vistos.has(chave)) continue;

    vistos.add(chave);
    limpos.push(nome);
  }

  // ordenar alfabeticamente
  return limpos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
