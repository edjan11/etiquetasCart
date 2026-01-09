const fetch = require('node-fetch');
const { promptDetectarCartorio } = require('./prompts');

/**
 * Revisa e corrige texto usando Ollama local
 */
async function revisarTexto(comunicado) {
  try {
    // Verifica se Ollama está rodando
    const isRunning = await checkOllama();
    if (!isRunning) {
      console.warn('⚠️ Ollama não está rodando. Pule a revisão.');
      return comunicado;
    }

    // Concatenar TODOS os campos de texto para busca de cartório
    const textoCompleto = [
      comunicado.assento_completo,
      comunicado.cartorio_emitente,
      comunicado.observacoes,
      comunicado.parte1,
      comunicado.parte2
    ].filter(Boolean).join('\n\n');

    const prompt = promptDetectarCartorio(textoCompleto);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s (prompt simples)

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'qwen2.5:1.5b', // Modelo eficiente e rápido (986MB)
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.0,
          top_p: 0.9,
          num_ctx: 2048,
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.response.trim();

    // Extrair JSON da resposta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ IA não retornou JSON válido');
      return comunicado;
    }

    const sugestoes = JSON.parse(jsonMatch[0]);

    // Aplicar correções
    const comunicadoRevisado = {
      ...comunicado,
      alertas: [...(comunicado.alertas || []), ...(sugestoes.alertas || [])]
    };

    // REGRA CRÍTICA: Detecção manual SEMPRE prevalece sobre IA
    // IA só preenche se não houver cartorio_origem já detectado
    // NUNCA sobrescrever valores das observações (OBSERVAÇÕES: 12, OBSERVAÇÕES: 26°, etc)
    if (sugestoes.cartorio_origem && !comunicado.cartorio_origem) {
      console.log(`✅ IA preencheu cartório: ${sugestoes.cartorio_origem} (não havia detecção manual)`);
      comunicadoRevisado.cartorio_origem = sugestoes.cartorio_origem;
    } else if (comunicado.cartorio_origem) {
      console.log(`🔒 Cartório manual PRESERVADO: ${comunicado.cartorio_origem} (IA sugeriu: ${sugestoes.cartorio_origem || 'nada'})`);
    }

    // Remover campo alertas se vazio
    if (comunicadoRevisado.alertas.length === 0) {
      delete comunicadoRevisado.alertas;
    }

    return comunicadoRevisado;

  } catch (error) {
    console.warn('⚠️ Erro na revisão com IA:', error.message);
    return comunicado;
  }
}

/**
 * Verifica se Ollama está rodando
 */
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      timeout: 2000
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Analisa todos os comunicados e retorna resumo de problemas
 */
function analisarProblemas(comunicados) {
  const problemas = {
    semCartorio: [],
    dadosIncompletos: [],
    possiveisErros: []
  };

  comunicados.forEach((com, idx) => {
    const num = idx + 1;

    // Sem cartório
    if (!com.cartorio_origem && !/cartório de origem:/i.test(com.parte2 || '')) {
      problemas.semCartorio.push({
        numero: num,
        nome: com.nome_registrado || com.nome1,
        sugestao: detectarCartorioNasObservacoes(com.observacoes)
      });
    }

    // Dados incompletos
    if (!com.livro_origem || !com.folha_origem || !com.termo_origem) {
      problemas.dadosIncompletos.push({
        numero: num,
        nome: com.nome_registrado || com.nome1,
        faltando: [
          !com.livro_origem && 'Livro',
          !com.folha_origem && 'Folha',
          !com.termo_origem && 'Termo'
        ].filter(Boolean)
      });
    }

    // Possíveis erros de OCR (nomes muito curtos, caracteres estranhos)
    if (com.nome1 && com.nome1.length < 5) {
      problemas.possiveisErros.push({
        numero: num,
        campo: 'nome1',
        valor: com.nome1,
        motivo: 'Nome muito curto'
      });
    }
  });

  return problemas;
}

/**
 * Tenta detectar cartório nas observações
 */
function detectarCartorioNasObservacoes(obs) {
  if (!obs) return null;
  
  const texto = obs.toLowerCase();
  
  // Padrões mais agressivos
  const padroes = [
    // Padrão direto: "12º Ofício", "6º Oficio"
    /(\d{1,2})[ºª°]\s*(?:of[ií]cio)/i,
    // "acervo do 12º"
    /acervo.*?(\d{1,2})[ºª°]/i,
    // "antigo cartório do 6º"
    /antigo.*?cartório.*?(\d{1,2})[ºª°]/i,
    // "lavrado no 14º"
    /lavrado.*?(\d{1,2})[ºª°]/i,
    // "cartório de aracaju 15º"
    /cartório.*?aracaju.*?(\d{1,2})[ºª°]/i,
    // "registro do 12"
    /registro.*?(\d{1,2})[ºª°]/i,
    // "acervo extinto do 12"
    /acervo\s+extinto.*?(\d{1,2})[ºª°]/i
  ];
  
  const cartorios = [6, 12, 13, 14, 15, 24, 25, 26, 29];
  
  for (const padrao of padroes) {
    const match = texto.match(padrao);
    if (match) {
      const num = parseInt(match[1]);
      if (cartorios.includes(num)) {
        return `${num}º Ofício`;
      }
    }
  }
  
  return null;
}

module.exports = {
  revisarTexto,
  checkOllama,
  analisarProblemas
};
