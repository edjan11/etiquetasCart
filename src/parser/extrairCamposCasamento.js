function separarComunicados(texto) {
  return texto
    .split(/(?=Comunicação de Casamento Civil)/i)
    .map(t => t.trim())
    .filter(Boolean);
}

function extrairCampos(bloco) {
  const match = (regex, fallback = '') => {
    const m = bloco.match(regex);
    return m?.[1]?.trim() ?? fallback;
  };

  
  const assento_completo = match(/(Aos\s+\d{2}\/\d{2}\/\d{4}[\s\S]+?)(?=\s*(Ele|Ela|Registro|OBSERVAÇÕES|Aracaju|Em Branco|$))/i);
  const trechoOrigem = assento_completo ? bloco.split(assento_completo)[1] : bloco;
  
  const genero_registro = (() => {
    const trechoAposAssento = assento_completo ? bloco.split(assento_completo)[1] : '';
    if (/^\s*ela\b/i.test(trechoAposAssento)) return 'dela';
    if (/^\s*ele\b/i.test(trechoAposAssento)) return 'dele';
    return 'dele';
  })();

  // Extrações a partir do trecho de origem
  const matchLivroOrigem =
    trechoOrigem.match(/registro\s+(?:anterior|lavrado)?(?:\s+dele|\s+dela)?[:\-]?\s*livro\s+([AB])\s*(?:n[uú]mero\s+)?[º]?\s*([\w\-]+)/i) ||
    trechoOrigem.match(/registro civil no livro\s+([AB])\s+n[uú]mero\s+([\w\-]+)/i) ||
    trechoOrigem.match(/nascimento registrado.*?livro\s+([AB])\s*,?\s*folha/i) ||
    trechoOrigem.match(/registro.*?livro\s+([AB])\s*(?:n[uú]mero\s+)?[:º-]?\s*([\w\-]+)/i);

  const folhaOrigemMatch = trechoOrigem.match(/folha[s]?\s+(\d{1,4})/i);

  const termoOrigemMatch =
    trechoOrigem.match(/(?:registro|nascimento|casamento)[^\.]{0,100}?termo\s+(\d{3,6})/i) ||
    trechoOrigem.match(/sob\s+n[uú]mero\s+(\d{3,6})/i) ||
    trechoOrigem.match(/termo\s+(\d{3,6})/i);

  let observacoes = match(/OBSERVAÇÕES:\s*([\s\S]{10,300})/i);
  if (observacoes && !observacoes.match(/(?:cart[óo]rio\s+do\s+)?\d{1,3}[º°]?\s+Of[ií]cio/i)) {
    observacoes = '';
  }

  const matchOficio = observacoes?.match(/\b(?:acervo|cart[óo]rio|registro)?[\s\S]{0,80}?(\d{1,3})[º°]?\s+of[ií]cio/i);
  const oficiosValidos = ['6', '12', '13', '14', '15', '24', '25', '26', '29'];
  const cartorioOrigemMatch = matchOficio && oficiosValidos.includes(matchOficio[1]) ? matchOficio : null;
  
  return {
    cartorio_emitente: match(/Comunica[cç][aã]o de Casamento Civil\s+(.+?)\s+Ao/i),
    codigo: match(/Código da comunicação:\s*(\d{5,})/i),
    data: match(/Aos\s+(\d{2}\/\d{2}\/\d{4})/i),
    livro: match(/livro B (?:n[uú]mero|nº)?\s*([\w\-]+)/i),
    folha: match(/folhas\s+([\w]+)/i),
    termo: match(/termo\s+(\d{3,})/i),

    nome1: match(/casamento civil de:\s*([\s\S]+?),\s+o qual/i),
    novo_nome1: match(/o qual passou a assinar:\s*([\s\S]+?)(?=,| e|\.)/i),
    nome2: match(/e\s+([\s\S]+?),\s+a qual/i),
    novo_nome2: match(/a qual passou a assinar:\s*([\s\S]+?)(?=\.|,| e)/i),

    pais: match(/filh[ao] de\s*([\s\S]+? e [^\n,\.]+)/i),
    data_termo: match(/nascid[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i) ||
            match(/casad[ao]s?\s+aos\s*(\d{2}\/\d{2}\/\d{4})/i),


    operador: match(/Operador:\s*(.+)/i),
    observacoes,

    tipo_livro_origem: matchLivroOrigem?.[1] || '',
    livro_origem: matchLivroOrigem?.[2] || '',
    folha_origem: folhaOrigemMatch?.[1] || '',
    termo_origem: termoOrigemMatch?.[1] ?? '',
    
    genero_registro,
    cartorio_origem: cartorioOrigemMatch?.[1] ?? '',
    assento_completo,
    blocoOriginal: bloco
  };
}

module.exports = { separarComunicados, extrairCampos };
