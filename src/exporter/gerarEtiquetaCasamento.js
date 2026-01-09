function protegerEspacos(str) {
  return String(str || "")
    .replace(/\s+/g, " ") // espaço múltiplo -> 1
    .replace(/\n/g, " ") // quebra -> espaço
    .replace(/ /g, "\u00A0"); // espaço não quebrável
}

function limparTextoBruto(str) {
  return String(str || "")
    .replace(/\s+/g, " ") // espaço múltiplo
    .replace(/\n/g, " ") // quebra -> espaço
    .trim();
}

function detectarCartorio(texto) {
  if (!texto) return null;
  const str = String(texto);
  
  // REGRA FIXA: detectar padrões de acervo/origem (apenas números de Aracaju)
  const patterns = [
    /ACERVO\s+DO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /ACEVO\s+DO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /REGISTRADO\s+NO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /ASSENTO\s+PERTENCE\s+AO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /REGISTRO\s+LAVRADO\s+NO\s+(\d{1,2})[º°]?\s+OF[ÍI]CIO/i,
    /(?:^|\s)(\d{1,2})[º°]\s+OF[ÍI]CIO/i
  ];
  
  // CARTÓRIOS VÁLIDOS: apenas Aracaju/SE
  const oficiosValidos = ["6", "12", "13", "14", "15", "24", "25", "26", "29"];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && oficiosValidos.includes(match[1])) {
      return match[1] + "º Ofício";
    }
  }
  
  // FALLBACK: número isolado em observações (com ou sem º)
  // Aceita: "12", "12º", "26", "26°"
  const numeroSeco = str.match(/\b(\d{1,2})[º°]?\b/);
  if (numeroSeco && oficiosValidos.includes(numeroSeco[1])) {
    // Verificar se NÃO é parte de data (dd/mm/aaaa) ou livro/folha/termo
    const contexto = str.substring(Math.max(0, numeroSeco.index - 15), numeroSeco.index + 20);
    const isData = /\d{2}\/\d{2}\/\d{4}/.test(contexto);
    const isLivro = /livro\s+[AB]/i.test(contexto);
    const isFolha = /folhas?\s+\d+/i.test(contexto);
    const isTermo = /termo\s+\d+/i.test(contexto);
    
    if (!isData && !isLivro && !isFolha && !isTermo) {
      return numeroSeco[1] + "º Ofício";
    }
  }
  
  return null;
}

function gerarEtiqueta(comunicado) {
  const {
    cartorio_emitente,
    codigo,
    assento_completo,
    nome1,
    nome2,
    novo_nome1,
    novo_nome2,
    livro,
    folha,
    termo,
    livro_origem,
    folha_origem,
    termo_origem,
    tipo_livro_origem,
    cartorio_origem,
    pais,
    data_termo,
    observacoes,
    genero_registro,
    nome_registrado,
  } = comunicado;

  const nome1_seguro = protegerEspacos(nome1);
  const nome2_seguro = protegerEspacos(nome2);
  const novo_nome1_seguro = protegerEspacos(novo_nome1);
  const novo_nome2_seguro = protegerEspacos(novo_nome2);

  const parteNome = [
    nome1
      ? `${nome1_seguro}, o qual ${novo_nome1 ? `passou a assinar: ${novo_nome1_seguro}` : "continuou com o mesmo nome"}`
      : "",
    nome2
      ? `${nome2_seguro}, a qual ${novo_nome2 ? `passou a assinar: ${novo_nome2_seguro}` : "continuou com o mesmo nome"}`
      : "",
  ]
    .filter(Boolean)
    .join(", e ");

  const parte1 = [
    `Foi comunicado pelo Cartório de ${limparTextoBruto(cartorio_emitente || "[---]")}, código ${limparTextoBruto(codigo || "[---]")}, ${limparTextoBruto(assento_completo || "[---]")}`,
    parteNome,
  ]
    .filter(Boolean)
    .join(" ");
  
  // Tentar detectar cartório automaticamente se não foi informado
  const origemOficio = limparTextoBruto(cartorio_origem || "");
  
  // Buscar cartório nas observações E no assento_completo
  const cartorioDetectado = 
    origemOficio || 
    detectarCartorio(observacoes) || 
    detectarCartorio(assento_completo) || 
    detectarCartorio(cartorio_emitente);
  
  // DEBUG: verificar extração
  if (!cartorioDetectado && observacoes) {
    console.log(`⚠️ Cartório não detectado para ${nome_registrado}`);
    console.log(`   Observações:`, observacoes?.substring(0, 100));
  }

  // Formatar parte2 apenas com dados essenciais (formato compacto)
  const linhas = [];
  
  // Nome (sempre mostrar)
  if (nome_registrado) {
    linhas.push(`Nome: ${nome_registrado}`);
  }
  
  // MOSTRAR dados do REGISTRO ANTERIOR (nascimento/casamento anterior)
  // NÃO mostrar dados do casamento atual (já está no texto acima)
  const temRegistroAnterior = livro_origem || folha_origem || termo_origem;
  
  if (temRegistroAnterior) {
    linhas.push("");
    if (livro_origem) {
      linhas.push(`Livro: ${tipo_livro_origem || ""}${livro_origem}`);
    }
    if (folha_origem) {
      linhas.push(`Folha: ${folha_origem}`);
    }
    if (termo_origem) {
      linhas.push(`Termo: ${termo_origem}`);
    }
  }
  
  // Outros dados opcionais
  const dadosOpcionais = [];
  
  if (pais) {
    dadosOpcionais.push(`Filiacao: ${limparTextoBruto(pais)}`);
  }
  
  if (data_termo) {
    dadosOpcionais.push(`Data nascimento: ${limparTextoBruto(data_termo)}`);
  }
  
  if (cartorioDetectado) {
    dadosOpcionais.push(`Cartorio: ${cartorioDetectado}`);
  }
  
  // Adicionar linha em branco antes dos dados opcionais (se houver e não tiver registro anterior)
  if (dadosOpcionais.length > 0) {
    if (!temRegistroAnterior) {
      linhas.push("");
    }
    linhas.push(...dadosOpcionais);
  }

  const parte2 = linhas.join("\n");
  
  // DEBUG: ver o que está sendo gerado
  console.log(`📋 Parte2 gerada para ${nome_registrado}:`);
  console.log(parte2);
  console.log('---');

  const erros = [];
  if (!cartorioDetectado) erros.push("Cartório de origem ausente");
  if (!livro_origem) erros.push("Livro de origem ausente");
  if (!folha_origem) erros.push("Folha de origem ausente");
  if (!termo_origem) erros.push("Termo de origem ausente");

  return {
    parte1: parte1.trim(),
    parte2: parte2.trim(),
    erros,
  };
}

module.exports = gerarEtiqueta;
