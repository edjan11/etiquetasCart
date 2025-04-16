function protegerEspacos(str) {
  return String(str || '')
    .replace(/\s+/g, ' ')          // espaço múltiplo -> 1
    .replace(/\n/g, ' ')           // quebra -> espaço
    .replace(/ /g, '\u00A0');      // espaço não quebrável
}

function limparTextoBruto(str) {
  return String(str || '')
    .replace(/\s+/g, ' ')          // espaço múltiplo
    .replace(/\n/g, ' ')           // quebra -> espaço
    .trim();
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

  const nome1_seguro = protegerEspacos(nome1);
  const nome2_seguro = protegerEspacos(nome2);
  const novo_nome1_seguro = protegerEspacos(novo_nome1);
  const novo_nome2_seguro = protegerEspacos(novo_nome2);

  const parteNome = [
    nome1 ? `${nome1_seguro}, o qual ${novo_nome1 ? `passou a assinar: ${novo_nome1_seguro}` : 'continuou com o mesmo nome'}` : '',
    nome2 ? `${nome2_seguro}, a qual ${novo_nome2 ? `passou a assinar: ${novo_nome2_seguro}` : 'continuou com o mesmo nome'}` : ''
  ].filter(Boolean).join(', e ');

  const parte1 = [
    `Foi comunicado pelo Cartório de ${limparTextoBruto(cartorio_emitente || '[---]')}, código ${limparTextoBruto(codigo || '[---]')}, ${limparTextoBruto(assento_completo || '[---]')}.`,
    parteNome
  ].filter(Boolean).join(' ');

  const origemTexto = (livro_origem || folha_origem || termo_origem)
    ? (
        tipo_livro_origem === 'A'
          ? `Nascimento registrado ${genero_registro}: livro ${tipo_livro_origem || '[A/B]'} nº ${livro_origem || '[---]'}, folhas ${folha_origem || '[---]'}, termo ${termo_origem || '[---]'}.`
          : `Registro anterior ${genero_registro}: livro ${tipo_livro_origem || '[A/B]'} nº ${livro_origem || '[---]'}, folhas ${folha_origem || '[---]'}, termo ${termo_origem || '[---]'}.`
      )
    : '';

  const origemOficio = limparTextoBruto(cartorio_origem || '');

  const parte2 = [
    limparTextoBruto(origemTexto),
    pais ? `Filiação: ${limparTextoBruto(pais)}` : null,
    data_termo ? `Termo lavrado em: ${limparTextoBruto(data_termo)}` : null,
    origemOficio ? `Cartório de origem: ${origemOficio}` : null
  ].filter(Boolean).join(' ');

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
