// gerarListaPendentes.js
// gerarListaPendentes.js

function normalizarChave(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

// pode deixar o uniqOrdenado aqui se for usar em outra coisa
function uniqOrdenado(nomes) {
  const vistos = new Set();
  const saida = [];

  for (const n of nomes) {
    if (!n) continue;
    const chave = normalizarChave(n);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(n);
  }

  return saida.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * comunicados = array vindo do processamento do PDF
 * cada item deve ter:
 *  - erros: array de strings
 *  - nome_registrado: string
 *  - tipo_livro_origem: 'A' (nascimento) ou 'B' (casamento)
 */
function gerarListaPendentes(comunicados) {
  const casamento = [];
  const nascimento = [];

  for (const com of comunicados) {
    // mantém o filtro de pendente (se quiser TODOS os 252, tira essa linha)
    if (!com?.erros?.includes("Cartório de origem ausente")) continue;
    if (!com.nome_registrado) continue;

    if (com.tipo_livro_origem === "B") {
      casamento.push(com.nome_registrado);
    } else if (com.tipo_livro_origem === "A") {
      nascimento.push(com.nome_registrado);
    }
  }

  const linhas = [];

  if (casamento.length) {
    linhas.push("=== CASAMENTO ===");
    casamento.forEach((n, i) => {
      linhas.push(`${i + 1}. ${n}`);
    });
    linhas.push("");
  }

  if (nascimento.length) {
    linhas.push("=== NASCIMENTO ===");
    nascimento.forEach((n, i) => {
      linhas.push(`${i + 1}. ${n}`);
    });
    linhas.push("");
  }

  return linhas.join("\n");
}

module.exports = { gerarListaPendentes };
