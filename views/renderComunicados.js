// ===============================
// 🔵 Renderização dos comunicados
// ===============================
function renderComunicados(comunicados, erros, completosSet) {
  container.innerHTML = '';
  listaNomes.innerHTML = '';
  resumoEl.innerHTML = '';

  // ======================================================
  // 🔵 1) LATERAL — SEMPRE MOSTRAR TODOS COM NOME
  // ======================================================

  const todosLateral = comunicados.filter(c => c.nome_registrado);

  const nasc = [];
  const cas = [];

  todosLateral.forEach(com => {
    const tipo = inferirTipoComunicado(com);
    if (tipo === "NASCIMENTO") nasc.push(com);
    else cas.push(com);
  });

  // função para criar cards laterais
  function montarCardLateral(com) {
    const nomeCard = document.createElement("div");
    nomeCard.className = "conjuge-card";

    // detectar cartório salvo no texto
    const cartorioSalvo = (com.parte2 || "").match(/Cartório de origem:\s*(\d+)/i);
    const numeroSalvo = cartorioSalvo ? Number(cartorioSalvo[1]) : null;

    // se já tiver cartório → card acinzentado
    if (numeroSalvo) {
      nomeCard.classList.add("card-lateral-selecionado");
    }

    nomeCard.innerHTML = `
      <strong>${com.nome_registrado}</strong>

      <div class="botoes-cartorio" data-card="${com.id}">
        ${[6,12,13,14,15].map(n => `
          <button
            class="btn-cartorio ${numeroSalvo === n ? 'btn-cartorio-ativo' : ''}"
            data-id="${com.id}"
            data-cartorio="${n}"
          >${n}</button>
        `).join("")}
      </div>

      <div style="display:flex; gap:6px;">
        <button class="btn-copiar" onclick="navigator.clipboard.writeText('${com.nome_registrado}')">
          📋 Copiar Nome
        </button>
        <button class="btn-copiar" onclick="focusComunicado('${com.id}')">
          🔍 Ir para
        </button>
      </div>
    `;

    listaNomes.appendChild(nomeCard);

    // listeners
    nomeCard.querySelectorAll(".btn-cartorio").forEach(btn => {
      btn.addEventListener("click", () => {

        // limpa botões antigos deste card
        nomeCard.querySelectorAll(".btn-cartorio")
          .forEach(b => b.classList.remove("btn-cartorio-ativo"));

        // ativa o clicado
        btn.classList.add("btn-cartorio-ativo");

        // card acinzentado para indicar preenchimento
        nomeCard.classList.add("card-lateral-selecionado");

        // aplica cartório no comunicado
        definirCartorio(btn);

        // foca na área principal
        focusComunicado(btn.dataset.id);
      });
    });
  }

  // === Criar seções laterais (NADA SOME NUNCA) ===
  if (cas.length) {
    const t = document.createElement("div");
    t.className = "lista-titulo";
    t.textContent = "CASAMENTO";
    listaNomes.appendChild(t);
    cas.forEach(c => montarCardLateral(c));
  }

  if (nasc.length) {
    const t = document.createElement("div");
    t.className = "lista-titulo";
    t.textContent = "NASCIMENTO";
    listaNomes.appendChild(t);
    nasc.forEach(c => montarCardLateral(c));
  }

  // ======================================================
  // 🔵 2) ORDENAR COMUNICADOS NA TELA PRINCIPAL
  // ======================================================

  function extrairNumeroCartorio(com) {
    if (!com.parte2) return null;
    const m = com.parte2.match(/Cartório de origem:\s*(\d+)/i);
    return m ? parseInt(m[1],10) : null;
  }

  comunicados.sort((a,b)=>{

    const ca = extrairNumeroCartorio(a);
    const cb = extrairNumeroCartorio(b);

    const ha = ca !== null;
    const hb = cb !== null;

    // sem cartório primeiro
    if (!ha && hb) return -1;
    if (ha && !hb) return 1;

    const na = (a.nome_registrado || "").toUpperCase();
    const nb = (b.nome_registrado || "").toUpperCase();

    if (!ha && !hb) return na.localeCompare(nb) || String(a.id).localeCompare(String(b.id));

    if (ca !== cb) return ca - cb;

    return na.localeCompare(nb) || String(a.id).localeCompare(String(b.id));
  });

  // ======================================================
  // 🔵 3) GERAR CARDS DE COMUNICADOS (TELA DIREITA)
  // ======================================================

  comunicados.forEach((com,i)=>{

    const div = document.createElement("div");
    div.className = "comunicado";
    div.dataset.id = com.id;

    div.addEventListener("click", ()=>{
      document.querySelectorAll(".comunicado-selecionado")
        .forEach(el => el.classList.remove("comunicado-selecionado"));

      div.classList.add("comunicado-selecionado");
      currentComunicado = com;
    });

    const jaTem = /Cartório de origem:/i.test(com.parte2 || "");
    if (jaTem) div.classList.add("comunicado-preenchido");

    div.style.borderLeftColor = cores[i % cores.length];

    const num = document.createElement("span");
    num.className = "numero";
    num.textContent = `#${i+1}`;
    div.appendChild(num);

    const badge = document.createElement("span");
    badge.className = "badge " + (jaTem ? "concluido" : "pendente");
    badge.textContent = jaTem ? "Concluído" : "Pendente";
    num.after(badge);

  const p1 = document.createElement("div");
    p1.className = "content-editable";
    p1.contentEditable = "true";

    let texto = com.parte1 || "";

    // remove duplicações antigas de "Dou fé"
    texto = texto.replace(
      /(Dou fé,\s*Edjan Santos Melo\.)\s*(Dou fé,\s*Edjan Santos Melo\.)+/gi,
      "$1"
    );

    // adiciona "Dou fé" só se ainda não existir
    if (escrevente && !/dou fé,/i.test(texto)) {
      texto += ` Dou fé, ${escrevente}.`;
    }

    p1.innerHTML = texto;
    div.appendChild(p1);

    p1.addEventListener("blur", () => {
      com.parte1 = p1.innerHTML;
      persistSession();
    });



    const p2 = document.createElement("div");
    p2.className = "parte2";
    p2.contentEditable = "true";                // 👈 E AQUI
    p2.textContent = com.parte2 || "";
    div.appendChild(p2);

      const obs = document.createElement("textarea");
      obs.className = "observacoes";
      obs.placeholder = "Observações…";
      obs.value = com.observacoes || "";

      obs.addEventListener("input", () => {
        com.observacoes = obs.value;
        persistSession();
      });

      div.appendChild(obs);

    container.appendChild(div);
  });

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

  // card do comunicado principal
  const card = document.querySelector(`.comunicado[data-id="${id}"]`);
  if (!card) return;

  const parte2 = card.querySelector('.parte2');
  if (!parte2) return;

  // ==========================
  // 1) APLICAR CARTÓRIO NO TEXTO DO COMUNICADO
  // ==========================
  if (!/Cartório de origem:/i.test(parte2.textContent)) {
    parte2.textContent += `\nCartório de origem: ${cartorio}º Ofício`;
  } else {
    parte2.textContent = parte2.textContent.replace(
      /Cartório de origem:[^\n]*/i,
      `Cartório de origem: ${cartorio}º Ofício`
    );
  }

  // ==========================
  // 2) MARCAR O COMUNICADO COMO PREENCHIDO
  // ==========================
  card.classList.add("comunicado-preenchido");

  // ==========================
  // 3) NÃO ALTERAR NENHUM BOTÃO DA LATERAL
  //    (removido!)
  // ==========================

  // ==========================
  // 4) SALVAR A SESSÃO
  // ==========================
  persistSession();

  // ==========================
  // 5) IR PARA O PRÓXIMO AUTOMATICAMENTE
  // ==========================
  const next = card.nextElementSibling;

  if (next && next.classList.contains("comunicado")) {
    next.scrollIntoView({ behavior: "smooth", block: "center" });
    next.click();
  }
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
// ⬇ Exportar TXT com pendentes (ordenado e limpo)
// ===============================
function exportPendentesTxt(pendCasamento, pendNascimento) {
  const linhas = [];

  // 🔹 Ordenar alfabeticamente por nome_registrado
  pendCasamento = [...pendCasamento].sort((a, b) =>
    (a.nome_registrado || '').localeCompare(b.nome_registrado || '', 'pt-BR')
  );

  pendNascimento = [...pendNascimento].sort((a, b) =>
    (a.nome_registrado || '').localeCompare(b.nome_registrado || '', 'pt-BR')
  );

  // 🔹 Limpa lixo que vem grudado no campo "pais"
  function limparCampoPais(str) {
    if (!str) return '';

    let s = String(str);

    // corta tudo a partir de OBSERVAÇÕES / Ilmo / OFICIAL
    s = s.split(/OBSERVAÇÕES:/i)[0];
    s = s.split(/Observações:/i)[0];
    s = s.split(/Ilmo\(a\)/i)[0];
    s = s.split(/OFICIAL\(a\)/i)[0];

    // normaliza espaços
    s = s.replace(/\s+/g, ' ').trim();
    if (!s) return '';

    // se ainda sobrou coisa tipo "e , nascida aos .", descarta
    if (/nascid/i.test(s)) return '';

    return s;
  }

  function adicionarSecao(titulo, lista) {
    if (!lista.length) return;

    linhas.push(`=== ${titulo} ===`);

    lista.forEach(com => {
      // pais bruto pode vir com OBSERVAÇÕES, Ilmo, etc.
      let paisRaw = com.pais || '';
      const { p1, p2 } = splitPais(paisRaw);

      const pai1 = limparCampoPais(p1);
      const pai2 = limparCampoPais(p2);

      linhas.push(`R: ${com.nome_registrado || ''}`);

      if (pai1) {
        linhas.push(`P: ${pai1}`);
      }

      if (pai2) {
        linhas.push(`P2: ${pai2}`);
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
