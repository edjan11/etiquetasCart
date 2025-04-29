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

  const matchAssento = bloco.match(
    /(Aos\s+\d{2}\/\d{2}\/\d{4}[\s\S]+?)(?=\s*(\bEle\b|\bEla\b|Registro|OBSERVAÇÕES|Aracaju|Em Branco|$))/, // <-- sem flag 'i'
  );
  const assento_completo = matchAssento ? matchAssento[1].trim() : null;

  // insere a quebra de linha depois do trecho capturado
  const trechoOrigem = assento_completo
    ? bloco.replace(assento_completo, assento_completo + "\n\n")
    : bloco;

  const genero_registro = (() => {
    const trechoAposAssento = assento_completo
      ? bloco.split(assento_completo)[1]
      : "";
    if (/^\s*ela\b/i.test(trechoAposAssento)) return "dela";
    if (/^\s*ele\b/i.test(trechoAposAssento)) return "dele";
    return "dele";
  })();

  // Extrações a partir do trecho de origem
  const matchLivroOrigem =
    trechoOrigem.match(
      /registro\s+(?:anterior|lavrado)?(?:\s+dele|\s+dela)?[:\-]?\s*livro\s+([AB])\s*(?:n[uú]mero\s+)?[º]?\s*([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /registro civil no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i,
    ) ||
    trechoOrigem.match(
      /nascimento registrado.*?livro\s+([AB])\s*,?\s*folha/i,
    ) ||
    trechoOrigem.match(
      /registro.*?livro\s+([AB])\s*(?:n[uú]mero\s+)?[:º-]?\s*([\w\-]+)/i,
    );

  const folhaOrigemMatch =
    trechoOrigem.match(
      /registro\s+(?:anterior|lavrado)?[^\.]{0,100}?folha[s]?\s+(\d{1,4})/i,
    ) ||
    trechoOrigem.match(/livro\s+[AB]?[º]?\s*\w*,?\s*folha[s]?\s+(\d{1,4})/i);

  const termoOrigemMatch =
    trechoOrigem.match(
      /(?:registro|nascimento|casamento)[^\.]{0,100}?termo\s+(\d{3,6})/i,
    ) ||
    trechoOrigem.match(/sob\s+n[uú]mero\s+(\d{3,6})/i) ||
    trechoOrigem.match(/termo\s+(\d{3,6})/i);

  let observacoes = match(/OBSERVAÇÕES:\s*([\s\S]{10,300})/i);
  if (
    observacoes &&
    !observacoes.match(/(?:cart[óo]rio\s+do\s+)?\d{1,3}[º°]?\s+Of[ií]cio/i)
  ) {
    observacoes = "";
  }

  const matchOficio = observacoes?.match(
    /\b(?:acervo|cart[óo]rio|registro)?[\s\S]{0,80}?(\d{1,3})[º°]?\s+of[ií]cio/i,
  );
  const oficiosValidos = ["6", "12", "13", "14", "15", "24", "25", "26", "29"];
  const cartorioOrigemMatch =
    matchOficio && oficiosValidos.includes(matchOficio[1]) ? matchOficio : null;

  // 1) Primeiro, isola só o parágrafo do casamento corretamente
  const blocoCasamento = bloco
    .split(
      /(?=Ele registrado|Ela registrada|Ele foi casado|Ela foi casada)/i,
    )[0] // corta ANTES desses trechos
    .split(/\.(\s+|$)/)[0]; // garante que corta no primeiro ponto final (sem avançar para outras seções)

  // 2) Limpa espaço antes da vírgula, que às vezes aparece errado
  const blocoCasamentoCorrigido = blocoCasamento.replace(/ ,/g, ",");

  // 3) Extrai todos os blocos em CAIXA ALTA dentro desse trecho (suporte total a acentos)
  const blocosMaiusculosBrutos = [
    ...blocoCasamentoCorrigido.matchAll(
      /[\p{Lu}\p{M}]+(?:\s+[\p{Lu}\p{M}]+)+/gu,
    ),
  ].map((m) => m[0].trim());

  // 4) Filtra blocos reais (nomes que tenham pelo menos duas palavras e sem palavras pequenas tipo "DE", "DA" sozinhas)
  const blocosMaiusculos = blocosMaiusculosBrutos.filter((nome) => {
    const palavras = nome.trim().split(/\s+/);
    return palavras.length >= 2 && palavras.every((p) => p.length > 2);
  });

  // 5) Função para checar se dois nomes começam iguais (primeira palavra igual)
  function nomesComecamIguais(nome1, nome2) {
    const primeiraPalavra1 = nome1.split(" ")[0];
    const primeiraPalavra2 = nome2.split(" ")[0];
    return primeiraPalavra1 === primeiraPalavra2;
  }

  // 6) Processo de captura dos cônjuges
  let index = 0;
  let nomeConjuge1 = blocosMaiusculos[index++] || "";
  let nomeConjuge1Alterado = null;
  let nomeConjuge2 = "";
  let nomeConjuge2Alterado = null;

  // Função que tenta detectar alteração de nome após o cônjuge no bloco
  function detectarAlteracao(nomeOriginal, texto) {
    const regex = new RegExp(
      nomeOriginal + ".*?passou a assinar:\\s*([\\p{Lu}\\p{M}\\s]+)",
      "u",
    );
    const match = texto.match(regex);
    return match ? match[1].trim() : null;
  }

  // Verifica se o primeiro cônjuge mudou de nome
  const trechoPosterior1 = blocoCasamentoCorrigido.slice(
    blocoCasamentoCorrigido.indexOf(nomeConjuge1),
  );
  nomeConjuge1Alterado = detectarAlteracao(nomeConjuge1, trechoPosterior1);

  // Captura segundo cônjuge
  nomeConjuge2 = blocosMaiusculos[index++] || "";

  // Verifica se o segundo cônjuge mudou de nome
  const trechoPosterior2 = blocoCasamentoCorrigido.slice(
    blocoCasamentoCorrigido.indexOf(nomeConjuge2),
  );
  nomeConjuge2Alterado = detectarAlteracao(nomeConjuge2, trechoPosterior2);

  // 7) Decide qual usar conforme o gênero do registro
  const nome_registrado = (() => {
    if (genero_registro === "dele") {
      return nomeConjuge1Alterado || nomeConjuge1;
    }
    if (genero_registro === "dela") {
      return nomeConjuge2Alterado || nomeConjuge2;
    }
    return "";
  })();

  return {
    cartorio_emitente: match(
      /Comunica[cç][aã]o de Casamento Civil\s+(.+?)\s+Ao/i,
    ),
    codigo: match(/Código da comunicação:\s*(\d{5,})/i),
    data: match(/Aos\s+(\d{2}\/\d{2}\/\d{4})/i),
    livro: match(/livro B (?:n[uú]mero|nº)?\s*([\w\-]+)/i),
    folha: match(/folhas\s+([\w]+)/i),
    termo: match(/termo\s+(\d{3,})/i),

    novo_nome1: match(/o qual passou a assinar:\s*([\s\S]+?)(?=,| e|\.)/i),
    novo_nome2: match(/a qual passou a assinar:\s*([\s\S]+?)(?=\.|,| e)/i),

    pais: match(/filh[ao] de\s*([\s\S]+? e [^\n,\.]+)/i),
    data_termo:
      match(/nascid[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i) ||
      match(/casad[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i),

    operador: match(/Operador:\s*(.+)/i),
    observacoes,

    tipo_livro_origem: matchLivroOrigem?.[1] || "",
    livro_origem: matchLivroOrigem?.[2] || "",
    folha_origem: folhaOrigemMatch?.[1] || "",
    termo_origem: termoOrigemMatch?.[1] ?? "",

    nome_registrado,
    genero_registro,
    cartorio_origem: cartorioOrigemMatch?.[1] ?? "",
    assento_completo,
    blocoOriginal: bloco,
  };
}

module.exports = { separarComunicados, extrairCampos };
