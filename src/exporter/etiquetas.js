const PDFDocument = require("pdfkit");

function limparTexto(texto) {
  if (!texto) return "";

  const textoLimpo = String(texto)
    .replace(/\s{2,}/g, " ") // múltiplos espaços → 1
    .replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2") // separa grudados
    .replace(/\s([.,;:!?])/g, "$1") // tira espaço antes de pontuação
    .replace(/([.,;:!?])(?=\S)/g, "$1 ") // adiciona espaço após pontuação
    .trim();

  // separação automática em dois parágrafos
  const indexRegistro = textoLimpo.search(
    /Nascimento registrado|Registro lavrado|lavrado às/i,
  );

  if (indexRegistro > -1) {
    const comunicado = textoLimpo.slice(0, indexRegistro).trim();
    const registro = textoLimpo.slice(indexRegistro).trim();
    return `${comunicado}\n\n${registro}`;
  }

  return textoLimpo;
}

function gerarEtiquetasPDF(etiquetas = []) {
  return new Promise((resolve, reject) => {
    const largura = 127.5; // 4.5 cm
    const altura = 255; // 9 cm
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

      // Título centralizado
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Cartório do 9º Ofício de Aracaju/SE", padding, padding, {
          width: larguraUtil,
          align: "center",
        });

      // Texto corrido justificado
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(7.0);

      const paragrafos = texto.includes("\n\n")
        ? texto.split("\n\n")
        : texto.split(/(?=Nascimento registrado|Registro lavrado|lavrado às)/i);

      paragrafos.forEach((par, i) => {
        if (i > 0) doc.moveDown(0.5); // espaço entre parágrafos
        doc.text(par.trim(), {
          width: larguraUtil,
          align: "justify",
          lineGap: 0,
          indent: 0,
          paragraphGap: 5,
        });
      });
    });

    doc.end();
  });
}

module.exports = { gerarEtiquetasPDF };
