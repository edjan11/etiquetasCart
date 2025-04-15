function validarComunicado(dados) {
  const erros = [];

  // Valida cartório de origem (ofício)
  if (!dados.origemOficio || dados.origemOficio.trim() === '') {
    erros.push("Cartório de origem ausente");
  }

  // Valida livro, folha e termo de origem, mas só se houver alguma indicação de origem
  const temOrigem = Boolean(dados.origemOficio?.trim() || dados.observacoes?.trim());

  if (temOrigem && !dados.livro_origem) erros.push("Livro de origem ausente");
  if (temOrigem && !dados.folha_origem) erros.push("Folha de origem ausente");
  if (temOrigem && !dados.termo_origem) erros.push("Termo de origem ausente");

  return {
    valido: erros.length === 0,
    erros
  };
}

module.exports = { validarComunicado };
