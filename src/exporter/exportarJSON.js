/**
 * Exportador JSON completo para comunicados de casamento
 * Extrai dataset estruturado com todos os campos e metadados
 */

function detectarStatus(texto) {
  const upper = String(texto || "").toUpperCase();
  
  if (upper.includes("REJEITADO") || upper.includes("REJEITADA")) {
    const motivo = texto.match(/REJEITAD[OA][\s\-:]+(.+?)(?=\.|$)/i);
    return {
      status: "REJECTED",
      rejection_reason: motivo ? motivo[1].trim() : "Não especificado"
    };
  }
  
  return { status: "SENT", rejection_reason: null };
}

function detectarObito(texto) {
  if (!texto) return null;
  
  const match = texto.match(/[óo]bito[\s\S]{0,150}?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,100}?(livro\s+C[\s\S]{0,50}?folh[as]+\s+[\d]+[\s\S]{0,50}?n[úu]mero\s+[\d]+)/i);
  
  if (match) {
    return {
      death_date: match[1],
      death_reference: match[2]
    };
  }
  
  return null;
}

function detectarDivorcio(texto) {
  if (!texto) return null;
  
  const match = texto.match(/div[óo]rcio[\s\S]{0,200}?(processo|mandado)[\s\S]{0,200}?(\d{2}\/\d{2}\/\d{4})/i);
  
  if (match) {
    return {
      divorce_date: match[2],
      divorce_reference: match[0].trim()
    };
  }
  
  return null;
}

function extrairTagsObservacoes(texto) {
  if (!texto) return [];
  
  const tags = [];
  const upper = String(texto).toUpperCase();
  
  if (upper.includes("ACERVO") || upper.includes("ACEVO")) {
    tags.push("ACERVO_OUTRO_OFICIO");
  }
  
  if (upper.includes("REGISTRO LAVRADO")) {
    tags.push("REGISTRO_LAVRADO_OUTRO_OFICIO");
  }
  
  if (upper.includes("SEM DADOS") || upper.includes("NÃO CONSTA")) {
    tags.push("SEM_DADOS_NASCIMENTO");
  }
  
  if (upper.includes("ÓBITO") || upper.includes("OBITO")) {
    tags.push("OBITO_INFORMADO");
  }
  
  if (upper.includes("DIVÓRCIO") || upper.includes("DIVORCIO")) {
    tags.push("DIVORCIO_INFORMADO");
  }
  
  return tags;
}

function extrairCamposFaltantes(comunicado) {
  const missing = [];
  
  if (!comunicado.livro) missing.push("livro_b");
  if (!comunicado.folha) missing.push("folha");
  if (!comunicado.termo) missing.push("termo");
  if (!comunicado.nome_registrado) missing.push("nome_registrado");
  if (!comunicado.pais) missing.push("filiacao");
  if (!comunicado.data_termo) missing.push("data_nascimento");
  if (!comunicado.cartorio_origem && !comunicado.observacoes?.match(/\d{1,2}[º°]?\s*[oO]f[íi]cio/)) {
    missing.push("cartorio_origem");
  }
  
  return missing;
}

function gerarWarnings(comunicado) {
  const warnings = [];
  const status = detectarStatus(comunicado.blocoOriginal || "");
  
  if (status.status === "REJECTED") {
    warnings.push(`REJEITADO: ${status.rejection_reason}`);
  }
  
  if (!comunicado.livro && !comunicado.folha && !comunicado.termo) {
    warnings.push("Todos os campos principais ausentes (livro/folha/termo)");
  }
  
  if (comunicado.observacoes) {
    if (detectarObito(comunicado.observacoes)) {
      warnings.push("Óbito informado nas observações");
    }
    if (detectarDivorcio(comunicado.observacoes)) {
      warnings.push("Divórcio informado nas observações");
    }
  }
  
  return warnings;
}

function converterParaJSON(comunicados) {
  return comunicados.map(com => {
    const statusInfo = detectarStatus(com.blocoOriginal || "");
    const obitoInfo = detectarObito(com.observacoes);
    const divorcioInfo = detectarDivorcio(com.observacoes);
    const tagsObs = extrairTagsObservacoes(com.observacoes);
    const camposFaltantes = extrairCamposFaltantes(com);
    const warnings = gerarWarnings(com);
    
    // Extrair origem/destino
    const origemMatch = (com.cartorio_emitente || "").match(/(.+?)\s*-\s*(\d+[º°]?\s*(?:Ofício|Subdistrito))\s*-\s*([A-Z]{2})/i);
    const destinoMatch = (com.blocoOriginal || "").match(/Ao\s+(.+?)\s*-\s*(\d+[º°]?\s*Ofício)\s*-\s*([A-Z]{2})/i);
    
    return {
      // Metadados da comunicação
      communication: {
        code: com.codigo || null,
        from_registry: {
          city: origemMatch ? origemMatch[1].trim() : com.cartorio_emitente || null,
          office: origemMatch ? origemMatch[2].trim() : null,
          uf: origemMatch ? origemMatch[3] : null
        },
        to_registry: {
          city: destinoMatch ? destinoMatch[1].trim() : "Aracaju",
          office: destinoMatch ? destinoMatch[2].trim() : "9º Ofício",
          uf: destinoMatch ? destinoMatch[3] : "SE"
        },
        issued_at: com.data || null,
        operator: com.operador || null,
        status: statusInfo.status,
        rejection_reason: statusInfo.rejection_reason
      },
      
      // Dados do casamento
      marriage: {
        marriage_date: com.data || null,
        book_b: com.livro || null,
        page: com.folha || null,
        term: com.termo || null,
        spouse_1: {
          name_before: com.nome1 || null,
          name_after: com.novo_nome1 || com.nome1 || null,
          name_change_type: com.novo_nome1 ? "CHANGED" : "KEPT",
          gender: com.genero_registro === "dele" ? "M" : null
        },
        spouse_2: {
          name_before: com.nome2 || null,
          name_after: com.novo_nome2 || com.nome2 || null,
          name_change_type: com.novo_nome2 ? "CHANGED" : "KEPT",
          gender: com.genero_registro === "dela" ? "F" : null
        }
      },
      
      // Referências a outros registros
      references: {
        birth_reference: {
          type: com.tipo_livro_origem === "A" ? "BIRTH" : "OTHER",
          book: com.tipo_livro_origem ? `${com.tipo_livro_origem}${com.livro_origem}` : null,
          page: com.folha_origem || null,
          term: com.termo_origem || null,
          parents: {
            full: com.pais || null,
            father: null, // TODO: separar pais
            mother: null
          },
          birth_date: com.data_termo || null,
          registry_office: com.cartorio_origem || null
        },
        death_reference: obitoInfo,
        divorce_reference: divorcioInfo
      },
      
      // Observações
      observations: {
        raw: com.observacoes || null,
        tags: tagsObs
      },
      
      // Qualidade dos dados
      data_quality: {
        missing_fields: camposFaltantes,
        warnings: warnings,
        completeness_score: Math.round((1 - camposFaltantes.length / 7) * 100)
      },
      
      // Nome registrado final (para identificação)
      registered_name: com.nome_registrado || null,
      gender: com.genero_registro || null
    };
  });
}

module.exports = {
  converterParaJSON,
  detectarStatus,
  detectarObito,
  detectarDivorcio,
  extrairTagsObservacoes
};
