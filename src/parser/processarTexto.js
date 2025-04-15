const { separarComunicados, extrairCampos } = require('./extrairCamposCasamento');
const { validarComunicado } = require('./validarComunicado');

function processarTexto(texto) {
  const blocos = separarComunicados(texto);
  const resultados = [];
  const relatorio = [];

  blocos.forEach((bloco, index) => {
    const campos = extrairCampos(bloco);
    const validacao = validarComunicado(campos);

    resultados.push({
      id: index + 1,
      ...campos,
      erros: validacao.erros,
      valido: validacao.valido
    });

    if (!validacao.valido) {
      relatorio.push({ id: index + 1, erros: validacao.erros });
    }
  });

  return { resultados, relatorio };
}

module.exports = { processarTexto };
