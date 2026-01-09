function separarComunicados(texto) {
  return texto
    .split(/(?=Comunicação de Casamento Civil)/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

function extrairCampos(bloco) {
  const match = (regex, fallback = "") => {
    const m = bloco.match(regex);
    return m?.[1]?.trim() ?? fallback;
  };

  // =========================
  // HELPERs PARA NOMES
  // =========================
  const BARBARIDADES = [
    "O MESMO",
    "MESMO",
    "NÃO ALTEROU",
    "NAO ALTEROU",
    "SEM ALTERAÇÃO",
    "SEM ALTERACAO",
    "NÃO HOUVE ALTERAÇÃO",
    "NAO HOUVE ALTERACAO",
    "S",
    "M",
  ];

  function limparNome(nome) {
    if (!nome) return "";
    return nome
      .replace(/\s+/g, " ")
      .replace(/^[\-\:,]+|[\-\:,]+$/g, "")
      .trim();
  }

  function ehNomeInvalido(nome) {
    if (!nome) return true;
    const limpo = limparNome(nome).toUpperCase();
    if (!limpo) return true;
    if (limpo.length <= 3) return true;
    if (BARBARIDADES.includes(limpo)) return true;
    return false;
  }

  function escaparRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // tenta pegar "passou a assinar: ..."
  function detectarAlteracao(nomeOriginal, texto) {
    const base = limparNome(nomeOriginal);
    if (!base) return null;

    const escapedOriginal = escaparRegex(base);
    const regex = new RegExp(
      escapedOriginal +
        "[\\s\\S]{0,120}?passou a assinar:\\s*([\\p{L}\\p{M}\\s]+?)(?=[\\.,;]|$)",
      "iu",
    );
    const m = texto.match(regex);
    if (!m) return null;

    const candidato = limparNome(m[1]);
    if (ehNomeInvalido(candidato)) return null;
    return candidato;
  }

  // fallback: "casamento civil de: NOME1, o qual ... e NOME2, a qual ..."
  function extrairConjugesHeader(texto) {
    // tenta pegar os dois
    const dupla = texto.match(
      /casamento civil de:\s*([^,]+?),\s*(?:o|a)\s+qual[\s\S]{0,200}?\se\s*([^,]+?),\s*(?:o|a)\s+qual/i,
    );
    if (dupla) {
      return {
        c1: limparNome(dupla[1]),
        c2: limparNome(dupla[2]),
      };
    }

    // tenta pegar só o primeiro
    const unico = texto.match(/casamento civil de:\s*([^,]+?),/i);
    if (unico) {
      return {
        c1: limparNome(unico[1]),
        c2: "",
      };
    }

    return { c1: "", c2: "" };
  }

  function escolherNome(nomeOriginal, nomeAlterado, fallback) {
    const originalOk = ehNomeInvalido(nomeOriginal)
      ? ""
      : limparNome(nomeOriginal);
    const alteradoOk = ehNomeInvalido(nomeAlterado)
      ? ""
      : limparNome(nomeAlterado || "");

    if (alteradoOk) return alteradoOk;
    if (originalOk) return originalOk;

    const fallbackOk = ehNomeInvalido(fallback) ? "" : limparNome(fallback);
    return fallbackOk;
  }

  // =========================
  // ASSENTO / GÊNERO
  // =========================
  const matchAssento = bloco.match(
    /(Aos\s+\d{2}\/\d{2}\/\d{4}[\s\S]+?)(?=\s*(\bEle\b|\bEla\b|OBSERVAÇÕES|Aracaju|Em Branco|$))/,
  );
  const assento_completo = matchAssento ? matchAssento[1].trim() : null;

  // SEPARAR: texto do casamento (parágrafo 5) vs dados do registro anterior (parágrafo 6+)
  const parteCasamento = assento_completo || "";
  const parteRegistroAnterior = assento_completo
    ? bloco.split(assento_completo)[1] || ""
    : bloco;

  const trechoOrigem = parteRegistroAnterior; // NUNCA buscar no parágrafo do casamento!

  const genero_registro = (() => {
    const trechoAposAssento = assento_completo
      ? bloco.split(assento_completo)[1]
      : "";
    
    // Prioridade 1: Ela/Ele no início do texto após o assento
    if (/^\s*ela\s+(registrada|foi\s+casada)/i.test(trechoAposAssento)) return "dela";
    if (/^\s*ele\s+(registrado|foi\s+casado)/i.test(trechoAposAssento)) return "dele";
    
    // Prioridade 2: buscar em todo o bloco
    if (/\bela\s+registrada\b/i.test(bloco)) return "dela";
    if (/\bela\s+foi\s+casada\b/i.test(bloco)) return "dela";
    if (/\bele\s+registrado\b/i.test(bloco)) return "dele";
    if (/\bele\s+foi\s+casado\b/i.test(bloco)) return "dele";
    
    // Prioridade 3: detectar pelo pronome "a qual" vs "o qual"
    const conjugeMatch = bloco.match(/casamento civil de:\s*([^,]+),\s*(o|a)\s+qual/);
    if (conjugeMatch) {
      // Se tem dois cônjuges, pegar o segundo
      const segundoMatch = bloco.match(/,\s*e\s*([^,]+),\s*(o|a)\s+qual/);
      if (segundoMatch) {
        return segundoMatch[2].toLowerCase() === 'a' ? 'dela' : 'dele';
      }
      return conjugeMatch[2].toLowerCase() === 'a' ? 'dela' : 'dele';
    }
    
    return "dele";
  })();
  
  // =========================
  // DETECTAR REJEIÇÃO
  // =========================
  const rejeitado = /R\s*E\s*J\s*E\s*I\s*T\s*A\s*D\s*O/i.test(bloco);
  const motivoRejeicao = rejeitado ? match(/Motivo da rejeição:\s*(.+?)(?=\n|$)/i) : null;

  // =========================
  // LIVRO / FOLHA / TERMO ORIGEM
  // =========================
  // REGRA: Livro A + filiação = NASCIMENTO
  //        Livro B + "foi casado" = CASAMENTO ANTERIOR
  
  const matchLivroOrigem =
    trechoOrigem.match(
      /(?:Ele|Ela)\s+(?:registrad[oa]|foi\s+casad[oa]).*?no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /(?:registrad[oa]|foi\s+casad[oa])\s+neste\s+registro\s+civil.*?no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /(?:registrad[oa]|foi\s+casad[oa])\s+nesse\s+registro\s+civil.*?no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /registro\s+(?:anterior|lavrado)?(?:\s+dele|\s+dela)?[:\-]?\s*livro\s+([AB])\s*(?:n[uú]mero\s+)?[º]?\s*([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /registro civil no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /registrad[oa]\s+neste\s+registro\s+civil.*?livro\s+([AB])\s*(?:n[uú]mero)?\s*([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /foi\s+casad[oa]\s+nesse\s+registro\s+civil.*?livro\s+([AB])\s*(?:n[uú]mero)?\s*([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /nascimento registrado.*?livro\s+([AB])\s*,?\s*folha/i,
    ) ||
    trechoOrigem.match(
      /registro.*?livro\s+([AB])\s*(?:n[uú]mero\s+)?[:º-]?\s*([\w\-]+)/i,
    );

  const folhaOrigemMatch =
    trechoOrigem.match(
      /(?:Ele|Ela)\s+(?:registrad[oa]|foi\s+casad[oa]).*?(?:às\s+)?folha[s]?\s+(\d{1,4})/i,
    ) ||
    trechoOrigem.match(
      /registro\s+(?:anterior|lavrado)?[^\.]{0,100}?(?:às\s+)?folha[s]?\s+(\d{1,4})/i,
    ) ||
    trechoOrigem.match(/livro\s+[AB]?[º]?\s*\w*,?\s*(?:às\s+)?folha[s]?\s+(\d{1,4})/i);

  const termoOrigemMatch =
    trechoOrigem.match(
      /(?:Ele|Ela)\s+(?:registrad[oa]|foi\s+casad[oa]).*?sob\s+n[uú]mero\s+(\d{2,})/i,
    ) ||
    trechoOrigem.match(
      /(?:registro|nascimento|casamento)[^\.]{0,100}?termo\s+(\d{2,})/i,
    ) ||
    trechoOrigem.match(/sob\s+n[uú]mero\s+(\d{2,})/i) ||
    trechoOrigem.match(/termo\s+(\d{2,})/i);

  // =========================
  // OBSERVAÇÕES / CARTÓRIO ORIGEM
  // =========================
  
  // CARTÓRIOS VÁLIDOS: apenas Aracaju/SE
  const oficiosValidos = ["6", "12", "13", "14", "15", "24", "25", "26", "29"];
  
  let observacoes = match(/OBSERVAÇÕES:\s*([\s\S]{10,300})/i);
  
  // Validar: Deve ter número de cartório (com ou sem "Ofício")
  // ou conteúdo relevante (não apagar se tiver número válido)
  if (observacoes) {
    const temOficio = /(?:cartório\s+do\s+)?\d{1,3}[º°]?\s+Ofício/i.test(observacoes);
    const temNumeroSeco = /\b(\d{1,2})[º°]?\b/.test(observacoes);
    
    // Manter observações se tiver "Ofício" OU número válido isolado
    if (!temOficio && !temNumeroSeco) {
      observacoes = "";
    }
  }

  // Detectar cartório anterior (ACERVO, REGISTRADO NO, ASSENTO PERTENCE, etc.)
  const cartorioPatterns = [
    /ACERVO\s+DO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /ACEVO\s+DO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /REGISTRADO\s+NO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /ASSENTO\s+PERTENCE\s+AO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /REGISTRO\s+LAVRADO\s+NO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /(?:^|\s)(\d{1,2})[º°]\s+OF[ÍI]CIO/i
  ];
  
  let matchOficio = null;
  for (const pattern of cartorioPatterns) {
    matchOficio = (observacoes || bloco).match(pattern);
    if (matchOficio) break;
  }
  
  // FALLBACK: Se não achou padrão com "OFÍCIO", procurar número isolado em observações
  if (!matchOficio && observacoes) {
    const numeroSeco = observacoes.match(/\b(\d{1,2})[º°]?\b/);
    if (numeroSeco && oficiosValidos.includes(numeroSeco[1])) {
      // Validar contexto para evitar falsos positivos
      const contexto = observacoes.substring(Math.max(0, numeroSeco.index - 15), numeroSeco.index + 20);
      const isData = /\d{2}\/\d{2}\/\d{4}/.test(contexto);
      const isLivro = /livro\s+[AB]/i.test(contexto);
      const isFolha = /folhas?\s+\d+/i.test(contexto);
      const isTermo = /termo\s+\d+/i.test(contexto);
      
      if (!isData && !isLivro && !isFolha && !isTermo) {
        console.log(`🔍 PARSER detectou cartório nas observações: ${numeroSeco[1]}º Ofício`);
        matchOficio = numeroSeco; // Usar o número detectado
      }
    }
  }
  
  const cartorioOrigemMatch =
    matchOficio && oficiosValidos.includes(matchOficio[1]) ? matchOficio : null;

  // =========================
  // NOME DOS CÔNJUGES
  // =========================

  // 1) Isola parágrafo do casamento
  const blocoCasamento = bloco
    .split(
      /(?=Ele registrado|Ela registrada|Ele foi casado|Ela foi casada)/i,
    )[0]
    .split(/\.(\s+|$)/)[0];

  const blocoCasamentoCorrigido = blocoCasamento.replace(/ ,/g, ",");

  // 2) Nomes em CAIXA ALTA (com acentos)
  const blocosMaiusculosBrutos = [
    ...blocoCasamentoCorrigido.matchAll(
      /[\p{Lu}\p{M}]+(?:\s+[\p{Lu}\p{M}]+)+/gu,
    ),
  ].map((m) => m[0].trim());

  const blocosMaiusculos = blocosMaiusculosBrutos.filter((nome) => {
    const palavras = nome.trim().split(/\s+/);
    return palavras.length >= 2 && palavras.every((p) => p.length > 2);
  });

  function nomesComecamIguais(nome1, nome2) {
    const primeiraPalavra1 = nome1.split(" ")[0];
    const primeiraPalavra2 = nome2.split(" ")[0];
    return primeiraPalavra1 === primeiraPalavra2;
  }

  let index = 0;
  let nomeConjuge1 = blocosMaiusculos[index++] || "";
  let nomeConjuge1Alterado = null;
  let nomeConjuge2 = "";
  let nomeConjuge2Alterado = null;

  // Fallback a partir do cabeçalho "casamento civil de: ..."
  const { c1: fallbackConjuge1, c2: fallbackConjuge2 } =
    extrairConjugesHeader(blocoCasamentoCorrigido || bloco);

  // Normaliza e aplica fallback de cabeçalho, se necessário
  nomeConjuge1 = limparNome(nomeConjuge1);
  if (ehNomeInvalido(nomeConjuge1) && !ehNomeInvalido(fallbackConjuge1)) {
    nomeConjuge1 = fallbackConjuge1;
  }

  // 3) Verifica se o primeiro cônjuge mudou de nome
  if (nomeConjuge1) {
    const trechoPosterior1 = blocoCasamentoCorrigido.slice(
      blocoCasamentoCorrigido.indexOf(nomeConjuge1),
    );
    nomeConjuge1Alterado = detectarAlteracao(nomeConjuge1, trechoPosterior1);
  }

  // 4) Segundo cônjuge
  nomeConjuge2 = blocosMaiusculos[index++] || "";
  nomeConjuge2 = limparNome(nomeConjuge2);
  if (ehNomeInvalido(nomeConjuge2) && !ehNomeInvalido(fallbackConjuge2)) {
    nomeConjuge2 = fallbackConjuge2;
  }

  if (nomeConjuge2) {
    const trechoPosterior2 = blocoCasamentoCorrigido.slice(
      blocoCasamentoCorrigido.indexOf(nomeConjuge2),
    );
    nomeConjuge2Alterado = detectarAlteracao(nomeConjuge2, trechoPosterior2);
  }

  // 5) Decide nome_registrado com todas as regras
  const nomeEscolhidoConjuge1 = escolherNome(
    nomeConjuge1,
    nomeConjuge1Alterado,
    fallbackConjuge1,
  );
  const nomeEscolhidoConjuge2 = escolherNome(
    nomeConjuge2,
    nomeConjuge2Alterado,
    fallbackConjuge2,
  );

  const nome_registrado = (() => {
    if (genero_registro === "dele") {
      return nomeEscolhidoConjuge1 || nomeEscolhidoConjuge2 || "";
    }
    if (genero_registro === "dela") {
      return nomeEscolhidoConjuge2 || nomeEscolhidoConjuge1 || "";
    }
    return "";
  })();

  return {
    cartorio_emitente: match(
      /Comunica[cç][aã]o de Casamento Civil\s+(.+?)\s+Ao/i,
    ),
    codigo: match(/Código da comunicação:\s*(\d{5,})/i),
    data: match(/Aos\s+(\d{2}\/\d{2}\/\d{4})/i),
    
    // DADOS DO CASAMENTO: buscar APENAS no parágrafo do casamento (parteCasamento)
    livro: parteCasamento.match(/livro B (?:n[uú]mero|nº)?\s*([\w\-]+)/i)?.[1] || "",
    folha: parteCasamento.match(/folhas\s+([\w]+)/i)?.[1] || "",
    termo: parteCasamento.match(/termo\s+(\d{2,})/i)?.[1] || "",

    // continuam existindo como antes (brutos)
    novo_nome1: match(/o qual passou a assinar:\s*([\s\S]+?)(?=,| e|\.)/i),
    novo_nome2: match(/a qual passou a assinar:\s*([\s\S]+?)(?=\.|,| e)/i),

    pais: match(/filh[ao] de\s*([\s\S]+? e [^\n,\.]+)/i),
    
    // REGRA: Prioridade para data ligada ao tipo correto
    // 1. Data do Livro B (casamento) 
    // 2. Data ligada a "nascido aos" (nascimento)
    // 3. Qualquer data como fallback
    data_termo:
      match(/nascid[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i) ||
      match(/em\s+data\s+de\s*(\d{2}\/\d{2}\/\d{4})/i) ||
      match(/casad[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i),

    operador: match(/Operador:\s*(.+)/i),
    observacoes,

    tipo_livro_origem: matchLivroOrigem?.[1] || "",
    livro_origem: matchLivroOrigem?.[2] || "",
    folha_origem: folhaOrigemMatch?.[1] || "",
    termo_origem: termoOrigemMatch?.[1] ?? "",

    nome_registrado,
    genero_registro,
    cartorio_origem: cartorioOrigemMatch ? `${cartorioOrigemMatch[1]}º Ofício` : "",
    assento_completo,
    blocoOriginal: bloco,
    
    // Status de rejeição
    rejeitado: rejeitado,
    motivoRejeicao: motivoRejeicao,
  };
}

module.exports = { separarComunicados, extrairCampos };
