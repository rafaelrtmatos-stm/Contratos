# Sistema Automático de Seleção de Templates

## 📋 Visão Geral

O sistema mantém **9 templates no Supabase** e seleciona automaticamente qual usar baseado em:
1. **Tipo de contrato** (venda_vista, venda_parcelada, exclusividade)
2. **Ação do usuário** (baixar antes, link digital, baixar depois)
3. **Estado de assinatura** (quem já assinou e como)

---

## 🏗️ Arquitetura

```
Usuario clica "Baixar DOC"
        ↓
ContractViewer detecta ação
        ↓
resolveTemplate() decide qual template usar
        ↓
downloadTemplate() recupera do Supabase
        ↓
processarTags() processa assinaturas
        ↓
Gera DOCX final + download
```

---

## 📁 9 Templates (Supabase Storage)

### VENDA À VISTA
```
venda_vista_assinatura_digital.docx
  └─ Quando: Ambos vão assinar DIGITAL
  └─ Testemunhas: ❌ NÃO
  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}, {{COMPRADOR_ASSINATURA_DIGITAL}}

venda_vista_assinatura_manual_2_testemunhas.docx
  └─ Quando: Ambos vão assinar MANUAL
  └─ Testemunhas: ✅ SIM (2)
  └─ Tags: {{USUARIO_ASSINATURA_MANUAL}}, {{COMPRADOR_ASSINATURA_MANUAL}}

venda_vista_mista_2_testemunhas.docx
  └─ Quando: Você DIGITAL + Comprador MANUAL
  └─ Testemunhas: ✅ SIM (2)
  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}, {{COMPRADOR_ASSINATURA_MANUAL}}
```

### VENDA PARCELADA
```
venda_parcelada_assinatura_digital.docx
venda_parcelada_assinatura_manual_2_testemunhas.docx
venda_parcelada_mista_2_testemunhas.docx
(idem estrutura da venda à vista)
```

### EXCLUSIVIDADE
```
exclusividade_assinatura_digital.docx
  └─ Quando: Ambos DIGITAL
  └─ Testemunhas: ❌ NÃO
  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}

exclusividade_mista_2_testemunhas.docx
  └─ Quando: Você DIGITAL + Contratante MANUAL
  └─ Testemunhas: ✅ SIM (2)
  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}

exclusividade_sem_conjuge_mista_2_testemunhas.docx
  └─ Variante SEM CÔNJUGE do contratante
  └─ Testemunhas: ✅ SIM (2)
  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}
```

---

## 🤖 Decisão Automática de Template

### Ação: "Baixar DOC/PDF antes de assinar"
```
Estado: usuário não assinou nada
→ Assuma o PIOR CASO (assinatura manual)
→ Use template: mista_2_testemunhas
→ Resultado: COM testemunhas
```

### Ação: "Gerar Link para Assinatura Digital"
```
Intenção: Assinatura 100% digital
→ Use template: assinatura_digital
→ Resultado: SEM testemunhas
```

### Ação: "Baixar DOC/PDF depois de assinar"
```
Verificar estado de assinatura:
  - Se ambos digitais → template digital (sem testemunhas)
  - Se alguém manual → template mista (com testemunhas)
  - Se ambos manuais → template manual (com testemunhas)
```

---

## 🔧 Como Usar no Código

### 1. Importar sistema de resolução
```typescript
import { resolveTemplate } from '@/utils/templateResolver';
import { downloadTemplateWithCache } from '@/utils/supabaseTemplateStorage';
```

### 2. Decidir qual template usar
```typescript
// Quando usuário clica "Baixar"
const templateResolved = resolveTemplate(
  'venda_vista',           // tipo do contrato
  'download_depois_assinar', // ação
  {                         // estado de assinatura
    usuarioAssinou: true,
    usuarioModalidade: 'digital',
    compradorAssinou: false,
    compradorModalidade: null,
    testemunhaprecisa: false,
  }
);

console.log(templateResolved.arquivo); // "venda_vista_assinatura_digital.docx"
```

### 3. Recuperar template do Supabase
```typescript
const { sucesso, blob, erro } = await downloadTemplateWithCache(
  templateResolved.arquivo
);

if (!sucesso) {
  console.error('Erro ao baixar template:', erro);
  return;
}

// blob agora contém o arquivo .docx
```

### 4. Processar tags e gerar documento final
```typescript
// (será implementado em docxProcessor.ts)
const tagsAssinatura = templateResolved.tagsAssinatura;
// Remove tags, insere selos digitais, mantém espaços manuais
```

---

## 📤 Setup Inicial - Upload de Templates

### 1. Criar bucket no Supabase
```sql
-- No Supabase, ir para Storage → New Bucket
-- Nome: contract-templates
-- Visibility: Public (se quiser URLs públicas)
```

### 2. Configurar arquivo .env
```
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..." (para script de upload)
```

### 3. Executar script de upload
```bash
npx tsx scripts/uploadTemplates.ts
```

Resultado:
```
📦 Iniciando upload de 9 templates para Supabase...

✅ venda_vista_assinatura_digital.docx (28.45KB)
✅ venda_vista_assinatura_manual_2_testemunhas.docx (28.50KB)
...

🎉 Todos os templates foram enviados com sucesso!
```

---

## 📊 Fluxo Completo

```
┌─ ContractViewer
│  └─ User clica "Baixar DOC"
│     └─ Passa tipo, ação, state para resolveTemplate()
│
├─ templateResolver.ts
│  └─ resolveTemplate() analisa ação + state
│     └─ Retorna TemplateResolved { arquivo, testemunhas, tagsAssinatura }
│
├─ supabaseTemplateStorage.ts
│  └─ downloadTemplateWithCache() recupera template do Supabase
│     └─ Retorna blob do arquivo .docx
│
├─ docxProcessor.ts (a implementar)
│  └─ processarTags() processa tags de assinatura
│     └─ Remove tags, insere selos, mantém espaços
│
└─ ContractViewer
   └─ Gera e faz download do PDF/DOCX final
```

---

## ✅ Checklist de Implementação

- [ ] Criar bucket `contract-templates` no Supabase
- [ ] Executar `scripts/uploadTemplates.ts` para enviar 9 templates
- [ ] Integrar `resolveTemplate()` em `ContractViewer`
- [ ] Integrar `downloadTemplateWithCache()` em download
- [ ] Implementar `processarTags()` para assinaturas
- [ ] Integrar processamento de tags no fluxo
- [ ] Testar cada cenário (digital/manual/mista)
- [ ] Testar para cada tipo (venda_vista/parcelada/exclusividade)

---

## 🧪 Testes

### Teste 1: Digital (sem testemunhas)
```
Ação: Gerar link digital
Template: assinatura_digital.docx
Resultado esperado: ❌ SEM testemunhas
Teste: Verificar que testemunhas NÃO aparecem
```

### Teste 2: Manual (com testemunhas)
```
Ação: Baixar antes de assinar
Template: mista_2_testemunhas.docx
Resultado esperado: ✅ COM 2 testemunhas
Teste: Verificar que 2 linhas de testemunha existem
```

### Teste 3: Mista (com testemunhas)
```
Ação: Você assinou digital, comprador ainda manual
Template: mista_2_testemunhas.docx
Resultado esperado: ✅ COM 2 testemunhas
Teste: Verificar selo do usuário + espaço do comprador
```

---

## 🔐 Segurança

- ✅ Templates armazenados no Supabase (backup automático)
- ✅ Sem duplicação local (reduz tamanho do repo)
- ✅ Versionamento de templates via git branches se necessário
- ✅ Service key separada para upload (não exposta no cliente)

---

## 📝 Próximas Etapas

1. **Processar tags de assinatura**
   - Remover tags `{{USUARIO_ASSINATURA_*}}`
   - Inserir selos digitais na posição da tag (se digital)
   - Deixar espaço em branco (se manual)

2. **Integração com assinatura digital**
   - Gerar URL de assinatura para comprador
   - Rastrear estado de assinatura (em Supabase)
   - Atualizar documento após assinatura concluída

3. **PDF final**
   - Converter DOCX → PDF
   - Incluir cabeçalho/rodapé com informações do contrato
   - Timestamp de geração

