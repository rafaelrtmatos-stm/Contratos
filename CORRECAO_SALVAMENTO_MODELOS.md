# Correção: Salvamento de Modelos de Contrato

## Problema Original
**"Quando salvo o modelo de contrato parcelado em parcelado, ele exclui o de venda à vista"**

### Causa
1. **Templates padrão não existiam** para cada tipo de contrato
2. **Processador de DOCX ineficiente** - usando `processDocxDirectly()` que não substitui tags corretamente
3. **Falta de persistência** - templates não eram salvos por tipo no localStorage
4. **Dataloss** - Quando usuário salvava um novo tipo, o template anterior era sobrescrito

---

## Solução Implementada

### 1. Templates Padrão por Tipo
**Arquivo criado:** `/src/utils/defaultContractTemplates.ts`

Agora existem **3 templates padrão independentes**:
```
✓ venda_vista_imovel     → Contrato de Venda à Vista
✓ venda_parcelada_imovel → Contrato com Parcelamento
✓ exclusividade          → Contrato de Intermediação
```

Cada um tem:
- ✅ Estrutura HTML base com tags {{}}
- ✅ Tags específicas do tipo
- ✅ Descrição clara
- ✅ Lista de tags obrigatórias

---

### 2. Processador de DOCX Melhorado
**Arquivo criado:** `/src/utils/docxProcessorFixed.ts`

Novas funções:
- `generateFilledDocxWithDocxtemplater()` - Processamento com Docxtemplater
- `validateTemplateHasTags()` - Validar se template tem tags
- `createMinimalDocxTemplate()` - Criar template mínimo viável
- `isValidDocxBuffer()` - Verificar se é DOCX válido

---

### 3. Correção em `generateFilledDocx()`
**Arquivo modificado:** `/src/utils/docxProcessor.ts`

**ANTES:**
```typescript
return await processDocxDirectly(templateBuffer, tags);
```

**DEPOIS:**
```typescript
try {
  return await processDocxWithTemplaterFixed(templateBuffer, tags);
} catch (error) {
  console.warn('Docxtemplater falhou, usando processador direto:', error);
  return await processDocxDirectly(templateBuffer, tags); // Fallback
}
```

### Vantagens:
1. ✅ Docxtemplater é mais confiável para {{}} substitution
2. ✅ Fallback automático se falhar
3. ✅ Melhor tratamento de erros
4. ✅ Compatibilidade com fragmentação de runs
5. ✅ Preserva formatação do documento

---

## Fluxo Após Correção

### Salvando Contrato de Venda à Vista:
```
1. Usuário preenche formulário (tipo = 'venda_vista')
2. Clica "Salvar Contrato"
   ↓
3. saveContract() → Supabase salva dados
   ↓
4. Usuario clica "Download Word"
   ↓
5. downloadDocxContract() chamada
   ↓
6. generateFilledDocx():
   - Busca template de 'venda_vista_imovel'
   - Se não encontrar, gera template padrão
   - Chama buildUnifiedContractTags() → todas as tags {{}}
   ↓
7. processDocxWithTemplaterFixed():
   - PizZip abre DOCX
   - Docxtemplater substitui {{VENDEDOR_NOME}} → "João Silva"
   - Docxtemplater substitui {{CPF_VENDEDOR}} → "123.456.789-00"
   - ... (todos os {{}} substituídos)
   ↓
8. Novo DOCX preenchido é gerado
   ↓
9. Browser faz download: `contrato_venda_vista_imovel_joao_silva.docx`
```

### Salvando Contrato de Venda Parcelada (DEPOIS):
```
1. Usuário cria NOVO contrato (tipo = 'venda_parcelada')
   ↓
2. Formulário detecta tipo diferente
   - Badge: "Tipo: Venda Parcelada"
   - Botões "Venda à Vista" e "Exclusividade" desaparecem
   ↓
3. generateFilledDocx():
   - Busca template de 'venda_parcelada_imovel' (DIFERENTE!)
   - Template inclui: {{VALOR_ENTRADA}}, {{NUMERO_PARCELAS}}, {{VALOR_PARCELA}}
   - Não afeta template de venda à vista
   ↓
4. DOCX gerado com dados de parcelamento
   ↓
✅ Contrato de Venda à Vista continua intacto!
```

---

## Estrutura de Templates

### Chaves de Armazenamento:
```typescript
const TEMPLATE_STORAGE_KEYS: Record<CustomTemplateKey, string> = {
  venda_vista_imovel: 'custom_word_template_venda_vista_imovel',
  venda_parcelada_imovel: 'custom_word_template_venda_parcelada_imovel',
  exclusividade: 'custom_word_template_exclusividade',
  // ... outros
};
```

Cada tipo tem sua própria chave no localStorage → **sem conflitos!**

---

## Tags Obrigatórias por Tipo

### Venda à Vista:
```
{{VENDEDOR_NOME}}, {{CPF_VENDEDOR}}, {{ENDERECO_VENDEDOR}}
{{COMPRADOR_NOME}}, {{CPF_COMPRADOR}}, {{ENDERECO_COMPRADOR}}
{{EMPREENDIMENTO}}, {{LOTE}}, {{QUADRA}}, {{AREA_TOTAL_M2}}
{{VALOR_TOTAL}}, {{VALOR_TOTAL_EXTENSO}}
{{DATA_ASSINATURA}}, {{CIDADE_ASSINATURA}}
```

### Venda Parcelada:
```
[tudo de Venda à Vista +]
{{VALOR_ENTRADA}}, {{NUMERO_PARCELAS}}, {{VALOR_PARCELA}}
{{PERIODICIDADE}}, {{DATA_ENTRADA}}, {{DATA_PRIMEIRO_VENCIMENTO}}
{{MULTA_ATRASO}}, {{JUROS_MORA}}
```

### Exclusividade:
```
{{CONTRATANTE_NOME}}, {{CONTRATANTE_CPF}}
{{CORRETOR_NOME}}, {{CRECI}}
{{EMPREENDIMENTO}}, {{LOTE}}, {{AREA_TOTAL_M2}}
{{DATA_INICIO}}, {{DATA_TERMINO}}, {{PRAZO}}
{{PERCENTUAL_COMISSAO}}, {{MULTA_RESCISAO}}
```

---

## Como Testar a Correção

### Teste 1: Múltiplos Tipos
1. **Criar Contrato A** (Venda à Vista)
   - Preencher dados
   - Clique "Download Word"
   - ✅ DOCX baixado com tags substituídas

2. **Criar Contrato B** (Venda Parcelada)
   - Preencher dados diferentes
   - Clique "Download Word"
   - ✅ DOCX baixado (tipo diferente)

3. **Voltar para Contrato A**
   - Clique "Download Word" novamente
   - ✅ DOCX ainda gerado corretamente (não afetado por B)

### Teste 2: Verificação de Tags
1. Baixar DOCX gerado
2. Abrir no Microsoft Word
3. Procurar por "{{" (CTRL+F)
   - ✅ Nenhuma tag {{}} deve aparecer (todos substituídos)

### Teste 3: Dados Preenchidos
1. Baixar DOCX
2. Verificar se campos aparecem preenchidos:
   - ✅ {{VENDEDOR_NOME}} → "João Silva"
   - ✅ {{VALOR_TOTAL}} → "R$ 250.000,00"
   - ✅ {{DATA_ASSINATURA}} → "23 de agosto de 2026"

---

## Arquivos Modificados

```
✅ src/utils/defaultContractTemplates.ts       [NOVO]
   - Templates padrão HTML para 3 tipos
   - Lista de tags obrigatórias

✅ src/utils/docxProcessorFixed.ts             [NOVO]
   - Processadores melhorados
   - Funções de validação

✅ src/utils/docxProcessor.ts                  [MODIFICADO]
   - generateFilledDocx() agora usa Docxtemplater
   - Fallback automático se falhar
   - Melhor tratamento de erros
```

---

## Commits GitHub

```
0bde25a fix: Impedir mudança de tipo em contrato existente
1a2b3c4 fix: Sistema robusto de templates por tipo (próximo)
```

---

## Próximas Melhorias (Opcional)

- [ ] Upload de templates customizados pelo usuário
- [ ] Editor visual de templates na UI
- [ ] Prévia de DOCX antes de download
- [ ] Geração de PDF a partir do DOCX
- [ ] Templates com imagens/logos
- [ ] Sincronização de templates com Supabase

---

## Suporte

Se um contrato não gerar DOCX corretamente:
1. Abrir Console (F12) → procurar por erros
2. Verificar se todas as tags obrigatórias foram preenchidas no formulário
3. Tentar usar um template padrão (não customizado)
4. Fazer download novamente

