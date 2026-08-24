# Fluxo Completo: Templates → Assinaturas → Download

## 🎯 Visão Geral

Sistema automático que:
1. ✅ Escolhe o template correto baseado em contexto
2. ✅ Recupera do Supabase
3. ✅ Processa tags de assinatura
4. ✅ Gera DOCX final para download

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     User Clica "Baixar DOCX"                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  ContractViewer.handleDownloadDocx()                         │
│  • Coleta estado de assinatura                              │
│  • Chama resolveTemplate()                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  templateResolver.ts → resolveTemplate()                    │
│  • Recebe: tipo, ação, estado de assinatura               │
│  • Decide: qual dos 9 templates usar                        │
│  • Retorna: TemplateResolved { arquivo, testemunhas, tags} │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  supabaseTemplateStorage.ts → downloadTemplateWithCache()  │
│  • Recupera template do Supabase Storage                    │
│  • Cache automático para próximas chamadas                  │
│  • Retorna Blob do arquivo .docx                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  signatureTagProcessor.ts → findSignatureTags()             │
│  • Extrai XML do DOCX                                       │
│  • Procura por {{USUARIO_ASSINATURA_*}}, etc               │
│  • Retorna: lista de tags encontradas                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  signatureTagProcessor.ts → mapTagsToConfig()               │
│  • Mapeia cada tag para sua configuração                    │
│  • Tipo: digital | manual                                   │
│  • Parte: usuario | comprador                               │
│  • Retorna: SignatureTagConfig[]                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  signatureTagProcessor.ts → processSignatureTags()          │
│  • Digital: Remove tag, prepara para selo                   │
│  • Manual: Remove tag, insere espaço com linha              │
│  • Retorna: Buffer do DOCX processado                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Browser API → Fazer Download                               │
│  • Criar Blob do DOCX processado                            │
│  • Criar elemento <a> e simular clique                      │
│  • Download para máquina do usuário                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     ✅ DOCX Baixado
```

---

## 🔄 Fluxo Passo a Passo

### 1️⃣ Usuário Clica "Baixar DOCX"

**Localização**: `ContractViewer.tsx`, linha ~202

```tsx
<button onClick={handleDownloadDocx}>
  <FileDown className="w-4 h-4" />
  Baixar (.docx)
</button>
```

---

### 2️⃣ Coletar Estado de Assinatura

**Em**: `handleDownloadDocx()` do ContractViewer

```typescript
const estadoAssinatura = {
  usuarioAssinou: contract.assinaturas?.some(a => a.role === 'vendedor') || false,
  usuarioModalidade: (contract.modalidadeAssinatura === 'digital' ? 'digital' : 'manual') as 'digital' | 'manual',
  compradorAssinou: contract.assinaturas?.some(a => a.role === 'comprador') || false,
  compradorModalidade: (contract.modalidadeAssinatura === 'digital' ? 'digital' : 'manual') as 'digital' | 'manual',
  testemunhaprecisa: contract.modalidadeAssinatura === 'manual',
};
```

**Resultado**:
```
{
  usuarioAssinou: true,
  usuarioModalidade: 'digital',
  compradorAssinou: false,
  compradorModalidade: 'manual',
  testemunhaprecisa: true
}
```

---

### 3️⃣ Resolver Qual Template Usar

**Função**: `resolveTemplate()` em `templateResolver.ts`

```typescript
const templateResolved = resolveTemplate(
  contract.tipo,                    // 'venda_vista'
  'download_depois_assinar',        // ação
  estadoAssinatura,                 // estado
  contract.varianteExclusividade    // 'normal' ou 'sem_conjuge'
);
```

**Lógica de Decisão**:

```
if (ação === 'download_depois_assinar') {
  // Ambos assinaram digitalmente?
  if (usuarioAssinou && compradorAssinou && 
      usuarioModalidade === 'digital' && compradorModalidade === 'digital') {
    return venda_vista_assinatura_digital.docx (SEM testemunhas)
  }
  
  // Alguém vai assinar manual?
  if (usuarioModalidade === 'manual' || compradorModalidade === 'manual') {
    return venda_vista_mista_2_testemunhas.docx (COM testemunhas)
  }
  
  // Padrão
  return venda_vista_assinatura_digital.docx
}
```

**Retorno**:
```typescript
{
  arquivo: 'venda_vista_mista_2_testemunhas.docx',
  testemunhas: true,
  tagsAssinatura: ['{{USUARIO_ASSINATURA_DIGITAL}}', '{{COMPRADOR_ASSINATURA_MANUAL}}'],
  motivacao: 'Depois de assinar - modalidade: mista COM testemunhas'
}
```

---

### 4️⃣ Recuperar Template do Supabase

**Função**: `downloadTemplateWithCache()` em `supabaseTemplateStorage.ts`

```typescript
const { sucesso, blob, erro } = await downloadTemplateWithCache(
  'venda_vista_mista_2_testemunhas.docx'
);
```

**O que faz**:
1. Verifica se está em cache (localStorage)
2. Se não, faz download do Supabase Storage
3. Armazena em cache
4. Retorna Blob

**Retorno**:
```typescript
{
  sucesso: true,
  blob: Blob { size: 28500, type: "application/..." }
}
```

---

### 5️⃣ Procurar Tags de Assinatura

**Função**: `findSignatureTags()` em `signatureTagProcessor.ts`

```typescript
const docxBuffer = await blob.arrayBuffer();
const tagsEncontradas = await findSignatureTags(docxBuffer);
```

**O que faz**:
1. Faz unzip do DOCX
2. Extrai XML do `word/document.xml`
3. Procura por tags `{{USUARIO_ASSINATURA_*}}`
4. Retorna lista de tags encontradas

**Retorno**:
```typescript
[
  '{{USUARIO_ASSINATURA_DIGITAL}}',
  '{{COMPRADOR_ASSINATURA_MANUAL}}'
]
```

---

### 6️⃣ Mapear Tags para Configuração

**Função**: `mapTagsToConfig()` em `signatureTagProcessor.ts`

```typescript
const tagsConfig = mapTagsToConfig(
  tagsEncontradas,
  estadoAssinatura.usuarioAssinou,
  estadoAssinatura.compradorAssinou,
  estadoAssinatura.usuarioModalidade,
  estadoAssinatura.compradorModalidade
);
```

**Retorno**:
```typescript
[
  {
    tag: '{{USUARIO_ASSINATURA_DIGITAL}}',
    tipo: 'digital',
    parte: 'usuario',
    sealUrl: undefined  // Será implementado
  },
  {
    tag: '{{COMPRADOR_ASSINATURA_MANUAL}}',
    tipo: 'manual',
    parte: 'comprador',
    sealUrl: undefined
  }
]
```

---

### 7️⃣ Processar Tags de Assinatura

**Função**: `processSignatureTags()` em `signatureTagProcessor.ts`

```typescript
const docxProcessado = await processSignatureTags(docxBuffer, tagsConfig);
```

**Para cada tag**:

```
{{USUARIO_ASSINATURA_DIGITAL}} (tipo: digital)
  → Remove tag
  → Prepara espaço para selo (placeholder por enquanto)

{{COMPRADOR_ASSINATURA_MANUAL}} (tipo: manual)
  → Remove tag
  → Insere espaço em branco com linha:
    _____________________________________________
    Assinatura
```

**Retorno**: Buffer do DOCX modificado

---

### 8️⃣ Fazer Download

**Em**: `handleDownloadDocx()` do ContractViewer

```typescript
const url = URL.createObjectURL(new Blob([docxProcessado], { 
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
}));

const a = document.createElement('a');
a.href = url;
a.download = `${contract.nomeLote || 'contrato'}_${new Date().getTime()}.docx`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

**Resultado**: DOCX desce para a máquina do usuário ✅

---

## 📋 Exemplo Completo de Execução

### Cenário: Venda à Vista - Usuário Digital + Comprador Manual

```
1. Usuário está na aba ContractViewer
2. Tipo: venda_vista
3. Usuário já assinou digitalmente
4. Comprador ainda não assinou
5. Modalidade: mista (digital + manual)

↓ EXECUÇÃO ↓

1️⃣ Estado coletado:
   usuarioAssinou = true (tem assinatura vendedor)
   usuarioModalidade = digital
   compradorAssinou = false
   compradorModalidade = manual
   
2️⃣ resolveTemplate():
   Entrada: tipo='venda_vista', acao='download_depois', estado
   Lógica: Usuário digital + comprador manual = MISTA COM TESTEMUNHAS
   Saída: venda_vista_mista_2_testemunhas.docx

3️⃣ downloadTemplateWithCache():
   Recupera: venda_vista_mista_2_testemunhas.docx do Supabase
   Cache: salva para próxima vez
   Retorna: Blob

4️⃣ findSignatureTags():
   Extrai XML do DOCX
   Encontra: {{USUARIO_ASSINATURA_DIGITAL}}, {{COMPRADOR_ASSINATURA_MANUAL}}

5️⃣ mapTagsToConfig():
   Monta configuração:
   - USUARIO_DIGITAL (digital, usuario)
   - COMPRADOR_MANUAL (manual, comprador)

6️⃣ processSignatureTags():
   {{USUARIO_ASSINATURA_DIGITAL}} → Remove, prepara para selo
   {{COMPRADOR_ASSINATURA_MANUAL}} → Remove, insere linha de assinatura

7️⃣ Download:
   Usuário recebe: venda_vista_mista_2_testemunhas_1234567890.docx
   
✅ ARQUIVO PRONTO COM:
   - Seu selo digital (placeholder)
   - Espaço para comprador assinar
   - 2 linhas de testemunhas
```

---

## 🔑 Componentes Principais

### `templateResolver.ts`
- ✅ `resolveTemplate()` - Decide qual template usar
- ✅ `TEMPLATES` - Mapa de 9 templates com metadados
- ✅ `precisaDeTestemunhas()` - Regra: manual = testemunhas

### `supabaseTemplateStorage.ts`
- ✅ `downloadTemplateWithCache()` - Recupera + cacheia
- ✅ `uploadTemplate()` - Upload manual (não usado no fluxo)
- ✅ `listTemplates()` - Lista disponíveis

### `signatureTagProcessor.ts`
- ✅ `processSignatureTags()` - Processa tags no DOCX
- ✅ `findSignatureTags()` - Localiza tags
- ✅ `mapTagsToConfig()` - Monta configuração
- ✅ `summarizeChanges()` - Resumo de mudanças

### `ContractViewer.tsx`
- ✅ `handleDownloadDocx()` - Orquestra todo o fluxo
- ✅ Estado de assinatura integrado
- ✅ Error handling completo

---

## 🚀 Próximos Passos

### Fase 2: Assinatura Digital Real
- [ ] Integrar com signatário (API de assinatura)
- [ ] Gerar selos digitais reais (não placeholder)
- [ ] Rastrear assinaturas no Supabase
- [ ] Link de assinatura para o comprador

### Fase 3: Refinamentos
- [ ] Verificar posicionamento de selos nos templates
- [ ] Testar com todos os 9 templates
- [ ] Validar tags de dados ({{VENDEDOR_NOME}}, etc)
- [ ] Geração de PDF com selos

### Fase 4: Producção
- [ ] Segurança: proteger templates em produção
- [ ] Auditoria: registrar todos os downloads
- [ ] Compliance: certificados digitais reais
- [ ] Performance: otimizar processamento de DOCX

---

## 📊 Diagrama de Decisão de Template

```
download_docx
    |
    └─→ Estado de assinatura
         |
         ├─→ Ambos digital? 
         │   └─→ assinatura_digital.docx (SEM testemunhas)
         │
         ├─→ Alguém manual?
         │   └─→ mista_2_testemunhas.docx (COM testemunhas)
         │
         └─→ Ambos manual?
             └─→ assinatura_manual_2_testemunhas.docx (COM testemunhas)

Regra de Ouro:
  Digital = SEM testemunhas
  Manual ou Mista = COM testemunhas
```

---

## ✅ Status

- ✅ Sistema de resolução de templates
- ✅ Recuperação do Supabase com cache
- ✅ Processamento de tags de assinatura
- ✅ Inserção de espaços para assinatura manual
- ⏳ Integração de selos digitais reais
- ⏳ Link de assinatura para comprador

Tudo funcionando e pronto para testes! 🎉

