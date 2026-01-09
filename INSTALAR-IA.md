# 🤖 Configuração da IA - Revisão Automática de Etiquetas

## ✅ O que foi implementado:

### Recursos automáticos:
1. **Correção de erros de OCR**: Nomes mal extraídos do PDF
2. **Detecção de cartório faltante**: Busca nas observações
3. **Alertas de dados incompletos**: Livro, Folha, Termo
4. **Padronização de nomes**: Pontuação e conjunções
5. **Análise inteligente**: Sugestões baseadas no contexto

---

## 📦 PASSO 1: Instalar Ollama (100% gratuito, ilimitado)

### Windows:
1. Baixe: https://ollama.com/download
2. Execute o instalador `OllamaSetup.exe`
3. Ollama rodará automaticamente em segundo plano

### Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## 🧠 PASSO 2: Baixar modelo de IA

Abra PowerShell e rode:

```powershell
ollama pull qwen3:4b
```

**Tamanho**: ~2.5GB  
**Tempo**: 3-7 minutos dependendo da internet

**Por que Qwen3:4b?**
- ✅ Melhor qualidade de respostas em português
- ✅ Maior coerência em tarefas de linguagem natural
- ✅ Otimizado para CPU (sem necessidade de GPU)
- ✅ Geração mais recente da família Qwen

### Modelos alternativos:

```powershell
# Mais rápido (menor qualidade)
ollama pull qwen3:1.8b

# Mais preciso (mais pesado)
ollama pull qwen3:8b

# Alternativa LLaMA
ollama pull llama3.2:3b
```

---

## 🔌 PASSO 3: Instalar dependências Node

Na pasta do projeto:

```powershell
npm install
```

Isso instala `node-fetch@2.7.0` (já adicionado ao package.json).

---

## 🚀 PASSO 4: Iniciar aplicação

```powershell
npm run dev
```

Você verá:

```
✅ Ollama ativo - Revisão automática habilitada
```

Se aparecer:

```
❌ Ollama inativo
```

**Solução**: Rode no PowerShell:
```powershell
ollama serve
```

---

## 📊 Como funciona:

### Ao fazer upload do PDF:

1. **Texto extraído** → Parser extrai campos
2. **🤖 IA revisa** cada comunicado automaticamente:
   - Corrige nomes com erros de OCR
   - Detecta cartório nas observações
   - Identifica dados faltantes
3. **📊 Painel de alertas** exibe problemas encontrados

### Painel de Alertas mostra:

```
⚠️ Alertas Automáticos
✅ Ollama ativo - Revisão automática habilitada

🏛️ Sem Cartório de Origem:
  • #3 ADRIANA OLIVEIRA - Possível: 12º Ofício

📄 Dados Incompletos:
  • #5 JOSÉ SANTOS - Faltando: Folha, Termo

⚠️ Possíveis Erros de OCR:
  • #7 nome1: "JOSÉ" - Nome muito curto
```

---

## ⚙️ Configurações avançadas:

### Mudar modelo no código:

Edite `src/ai/revisor.js` linha 49:

```javascript
model: 'qwen3:4b',  // Modelo padrão atual
```

### Ajustar temperatura (criatividade):

```javascript
temperature: 0.1,  // 0 = conservador, 1 = criativo
```

### Desabilitar temporariamente:

Pare o Ollama:
```powershell
taskkill /F /IM ollama.exe
```

A aplicação continuará funcionando, mas sem revisão IA.

---

## 🆚 Comparação de modelos:

| Modelo | Tamanho | Velocidade | Qualidade | Português | CPU-Only |
|--------|---------|------------|-----------|-----------|----------|
| qwen3:1.8b | 1GB | ⚡⚡⚡ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| **qwen3:4b** | **2.5GB** | **⚡⚡** | **⭐⭐⭐⭐** | **⭐⭐⭐⭐⭐** | **✅** |
| qwen3:8b | 4.7GB | ⚡ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| llama3.2:3b | 3GB | ⚡ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| gemma2:2b | 1.6GB | ⚡⚡ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |

**Recomendação**: `qwen3:4b` (melhor qualidade em português + otimizado para CPU)

---

## 🔧 Solução de problemas:

### Erro: "Ollama não está rodando"
```powershell
ollama serve
```

### Erro: "Failed to fetch"
Verifique se a porta 11434 está livre:
```powershell
netstat -ano | findstr :11434
```

### Modelo não encontrado:
```powershell
ollama list  # Ver modelos instalados
ollama pull qwen3:4b  # Reinstalar modelo padrão
```

### IA muito lenta:
Use modelo menor:
```powershell
ollama pull qwen3:1.8b
```

E edite `src/ai/revisor.js`:
```javascript
model: 'qwen3:1.8b',
```

---

## 💡 Dicas:

1. **Ollama roda em segundo plano** - não precisa abrir janela
2. **100% local** - não usa internet após baixar modelo
3. **Sem limites** - processe quantos PDFs quiser
4. **Privacidade total** - dados não saem do computador
5. **Funciona offline** - não precisa estar conectado

---

## 📝 Logs:

Para ver o que a IA está fazendo:

```javascript
// No server.js, adicione após linha 52:
console.log('🤖 IA revisou:', revisado);
```

---

## 🎯 Próximos passos:

- [ ] Treinar modelo customizado com dados de cartórios de Aracaju
- [ ] Adicionar validação de nomes contra base do IBGE
- [ ] Corrigir automaticamente números romanos (Iº → 1º)
- [ ] Detectar casamentos vs nascimentos automaticamente
- [ ] Sugerir correções de endereços
