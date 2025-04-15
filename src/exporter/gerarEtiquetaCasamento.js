function gerarEtiqueta(comunicado) {
  const {
    cartorio_emitente,
    codigo,
    assento_completo,
    nome1,
    nome2,
    novo_nome1,
    novo_nome2,
    livro_origem,
    folha_origem,
    termo_origem,
    tipo_livro_origem,
    cartorio_origem,
    pais,
    data_termo,
    observacoes,
    genero_registro,
    nome_registrado
  } = comunicado;

  const parte1 = `Foi comunicado pelo Cartório de ${cartorio_emitente || '[---]'}, código ${codigo || '[---]'}, ${assento_completo || '[---]'}`;


  const origemTexto = (livro_origem || folha_origem || termo_origem)
  ? (
      tipo_livro_origem === 'A'
        ? `Nascimento registrado ${genero_registro}: livro ${tipo_livro_origem || '[A/B]'} nº ${livro_origem || '[---]'}, folhas ${folha_origem || '[---]'}, termo ${termo_origem || '[---]'}`
        : `Registro anterior ${genero_registro}: livro ${tipo_livro_origem || '[A/B]'} nº ${livro_origem || '[---]'}, folhas ${folha_origem || '[---]'}, termo ${termo_origem || '[---]'}`
    )
  : null;

    const origemOficio = cartorio_origem || '';
    console.log(nome_registrado); // deve exibir "JOSÉ MARIA" ou "ANA CLARA"


  const parte2 = [
    origemTexto,
    pais ? `Filiação: ${pais}` : null,
    data_termo ? `Termo Lavrado em: ${data_termo}` : null,
    origemOficio ? `, cart.: ${origemOficio}` : null
  ].filter(Boolean).join('\n');

  const erros = [];
  if (!origemOficio) erros.push('Cartório de origem ausente');
  if (!livro_origem) erros.push('Livro de origem ausente');
  if (!folha_origem) erros.push('Folha de origem ausente');
  if (!termo_origem) erros.push('Termo de origem ausente');
 

  return {
    parte1: parte1.trim(),
    parte2: parte2.trim(),
    erros
  };
}

module.exports = gerarEtiqueta;
