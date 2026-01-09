const PDFDocument = require("pdfkit");

function limparTexto(texto) {
  if (!texto) return "";

  let textoLimpo = String(texto)
    // Remove emojis/ícones (causa problemas no PDF)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    // Remove TODAS as tags HTML
    .replace(/<[^>]+>/g, "")
    // Remove atributos HTML (style, align, etc)
    .replace(/style\s*=\s*["'][^"']*["']/gi, "")
    .replace(/align\s*=\s*["'][^"']*["']/gi, "")
    .replace(/class\s*=\s*["'][^"']*["']/gi, "")
    // Remove entidades HTML
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/&\w+;/g, "")
    // Normaliza quebras de linha Windows
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Compacta múltiplos espaços e tabs (PRESERVANDO \n)
    .replace(/[ \t]+/g, " ")
    // Remove espaços no início e fim de cada linha
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    // Separa palavras grudadas
    .replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2")
    // Arruma pontuação
    .replace(/\s([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])(?=\S)/g, "$1 ")
    .trim();

  // separação automática em dois parágrafos se ainda não estiver dividido
  if (!textoLimpo.includes("\n\n")) {
    const indexRegistro = textoLimpo.search(
      /Nascimento registrado|Registro lavrado|Registro anterior|lavrado às/i,
    );

    if (indexRegistro > -1) {
      const comunicado = textoLimpo.slice(0, indexRegistro).trim();
      const registro = textoLimpo.slice(indexRegistro).trim();
      return `${comunicado}\n\n${registro}`;
    }
  }

  return textoLimpo;
}


function gerarEtiquetasPDF(etiquetas = []) {
  return new Promise((resolve, reject) => {
    const largura = 127.5; // 4.5 cm
    const altura = 400; // 9 cm
    const padding = 5.67; // 0.2 cm (~4pt)

    const doc = new PDFDocument({
      size: [largura, altura],
      layout: "portrait",
      margin: 0,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    etiquetas.forEach((textoBruto, index) => {
      if (index > 0) doc.addPage();

      const texto = limparTexto(textoBruto);
      const larguraUtil = largura - 2 * padding;

      // Título em negrito
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("Cartório do 9º Ofício de Aracaju/SE", padding, padding, {
          width: larguraUtil,
          align: "center",
        });

      doc.moveDown(0.3);

      // Dividir em parágrafos
      const paragrafos = texto.includes("\n\n")
        ? texto.split("\n\n")
        : [texto];

      // Primeiro parágrafo: texto justificado normal (parte1)
      doc.font("Helvetica").fontSize(6.5);
      doc.text(paragrafos[0].trim(), {
        width: larguraUtil,
        align: "justify",
        lineGap: 0,
      });

      // Parte2: dados estruturados (SEMPRE renderizar tudo)
      if (paragrafos.length > 1) {
        doc.moveDown(0.5);
        doc.fontSize(6);
        
        // Renderizar todos os parágrafos restantes (parte2 completa)
        for (let i = 1; i < paragrafos.length; i++) {
          const bloco = paragrafos[i].trim();
          if (!bloco) continue;
          
          if (i > 1) doc.moveDown(0.3);
          
          doc.text(bloco, {
            width: larguraUtil,
            align: "left",
            lineGap: 0.5,
          });
        }
      }
    });

    doc.end();
  });
}

module.exports = { gerarEtiquetasPDF };
