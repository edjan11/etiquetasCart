/**
 * Prompts para a IA (Ollama)
 */

function promptDetectarCartorio(textoCompleto) {
  return `Analise este comunicado de casamento:

${textoCompleto.substring(0, 1500)}

Você é um extrator determinístico de dados jurídicos.
Sua tarefa é APENAS verificar se há menção EXPLÍCITA a cartório de origem.

REGRAS ABSOLUTAS (NÃO QUEBRE):
1. Só considere cartório se o texto contiver LITERALMENTE ou APROXIMADAMENTE uma destas expressões:
   - "Xº OFÍCIO"
   - "Xº OFICIO"
   - "ACERVO DO Xº"
   - "ACERVO DO Xº OFÍCIO"
   - "REGISTRADO NO Xº"
   - "REGISTRO LAVRADO NO Xº"
   Onde X é EXATAMENTE um destes números:
   6, 12, 13, 14, 15, 24, 25, 26, 29
   - Também podemos considerar "X" sem o "º" ou até mesmo quando vier OBSERVAÇÕES: [numero seco ou acompanhado de º]

2. NÃO deduza cartório por contexto.
   NÃO use conhecimento externo.
   NÃO presuma Aracaju se o número não estiver explícito.
   NÃO use observações genéricas (ex: "COMUNHÃO DE BENS").

3. Se houver mais de uma menção válida, retorne TODAS em lista.

4. Se NÃO houver menção EXPLÍCITA conforme regra 1:
   - retorne cartorio_origem como string vazia ""

5. NÃO escreva explicações.
   NÃO escreva texto fora do JSON.
   NÃO invente alertas.

FORMATO DE SAÍDA (JSON PURO):
{
  "cartorio_origem": "",
  "alertas": []
}

6. Evite ao maximo por um cartório sem que ele tenha sido indicado.

7. Evite confundir o numero de um livro, folha e termo com o do cartório, ex: "livro C, folha 45, termo 123 do 12º ofício" é valido, mas "livro A, folha 12, termo 34" não é.

8. Evite confundir datas com o numero do cartório, ex: "em 12/05/2020" não é valido.

Lembre-se: SUA SAÍDA DEVE SER APENAS UM OBJETO

EXEMPLO DE SAÍDA VÁLIDA:
{
  "cartorio_origem": "12º Ofício",
  "alertas": ["Cartório detectado em observações"]
}

EXEMPLO DE SAÍDA VÁLIDA (SEM CARTÓRIO):
{
  "cartorio_origem": "",
  "alertas": []
}

9. Cartório só existe quando o texto menciona explicitamente "Xº Ofício", "Acervo do Xº", ou equivalente literal.

JSON:`;
}

function promptCorrigirComunicado(comunicadoOriginal) {
  return `Analise: ${comunicadoOriginal.substring(0, 2000)}

SÓ corrija erros CRÍTICOS:
- Falta "livro B número X, folhas Y, termo Z"
- Falta cartório do casamento NO CORPO PRINCIPAL

REGRA IMPORTANTE:
Se o cartório do casamento não aparecer no corpo principal, verifique se no FINAL do texto ou em "OBSERVAÇÕES" existe um comunicado completo copiado/colado.
- Somente use o cartório se ele estiver EXPLICITAMENTE escrito nesse trecho.
- Não infira cartório por contexto, leis ou artigos (ex.: Lei 6.015/73).
- Se não houver menção literal, considere o cartório ausente.

Se OK, retorne null.

SAÍDA JSON:
{"precisa_correcao":false,"parte1_corrigida":null,"justificativa":"","alertas":[]}

JSON:`;
}


module.exports = {
  promptDetectarCartorio,
  promptCorrigirComunicado
};
