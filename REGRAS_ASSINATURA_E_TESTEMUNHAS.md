# Regras de Assinatura Digital e Testemunhas

## Principio Fundamental

```
Se TODAS as partes assinarem DIGITALMENTE → SEM testemunhas
Se QUALQUER parte assinar MANUALMENTE    → COM 2 testemunhas
```

---

## Regras de Processamento das Tags de Assinatura

### `{{USUARIO_ASSINATURA_DIGITAL}}`
- **Localizar** a tag no documento
- **Aguardar** a assinatura digital do usuário responsável
- **Após assinado:** Remover a tag
- **Inserir** o selo de assinatura digital na mesma posição
- **Nunca** deve aparecer no PDF/Word final

### `{{COMPRADOR_ASSINATURA_DIGITAL}}`
- **Localizar** a tag no documento
- **Aguardar** a assinatura digital do comprador
- **Após assinado:** Remover a tag
- **Inserir** o selo de assinatura digital na mesma posição
- **Nunca** deve aparecer no PDF/Word final

### `{{USUARIO_ASSINATURA_MANUAL}}`
- **Localizar** a tag no documento
- **Remover** a tag na versão final
- **Manter** um espaço adequado para assinatura manuscrita (em branco)

### `{{COMPRADOR_ASSINATURA_MANUAL}}`
- **Localizar** a tag no documento
- **Remover** a tag na versão final
- **Manter** um espaço adequado para assinatura manuscrita (em branco)

---

## Regras de Geração de Contrato

### 1. BAIXAR DOC/PDF ANTES DE INICIAR ASSINATURA DIGITAL

**Ação:** Usuário clica "Baixar" sem ter assinado nada

**Template:** `venda_vista_assinatura_manual_2_testemunhas.docx`

**Testemunhas:** ✅ COM 2 testemunhas
- Testemunha 1: linha para assinatura manual
- Testemunha 2: linha para assinatura manual

**Motivo:** Como não se sabe o fluxo de assinatura, assume-se o pior caso (manual)

---

### 2. ASSINATURA 100% DIGITAL (Ambos assinam digitalmente)

**Ação:** Usuário gera link para comprador assinar digitalmente

**Template:** `venda_vista_assinatura_digital.docx`

**Testemunhas:** ❌ SEM testemunhas

**Fluxo:**
1. Usuário assina digitalmente → gera selo
2. Comprador acessa link e assina digitalmente → gera selo
3. Sistema remove tags `{{USUARIO_ASSINATURA_DIGITAL}}` e `{{COMPRADOR_ASSINATURA_DIGITAL}}`
4. Sistema insere selos nas posições corretas
5. PDF final entregue SEM TESTEMUNHAS

---

### 3. USUÁRIO ASSINOU DIGITALMENTE → DEPOIS CLICA "BAIXAR PDF"

**Ação:** Usuário já assinou digitalmente e clica em "Baixar PDF"

**Estado:** 
- Usuário: ✅ Assinado (Digital)
- Comprador: ⏳ Aguardando assinatura

**Template:** `venda_vista_mista_2_testemunhas.docx`

**Testemunhas:** ✅ COM 2 testemunhas

**Fluxo:**
1. Sistema verifica: Usuário assinou DIGITAL, Comprador ainda não
2. Escolhe template COM TESTEMUNHAS
3. A assinatura digital do usuário permanece registrada/inserida no documento
4. Espaço para assinatura manual do comprador
5. 2 espaços para testemunhas (manual)
6. PDF baixado COM TESTEMUNHAS

---

### 4. AMBOS ASSINARAM DIGITALMENTE → CLICA "BAIXAR PDF"

**Ação:** Ambos já assinaram digitalmente e clica em "Baixar PDF"

**Estado:**
- Usuário: ✅ Assinado (Digital)
- Comprador: ✅ Assinado (Digital)

**Template:** `venda_vista_assinatura_digital.docx`

**Testemunhas:** ❌ SEM testemunhas

**Fluxo:**
1. Sistema verifica: Ambos assinaram DIGITAL
2. Escolhe template SEM TESTEMUNHAS
3. Ambas assinaturas digitais já registradas/inseridas
4. PDF final SEM TESTEMUNHAS

---

## Matriz de Decisão

```
AÇÃO DO USUÁRIO                          │ TEMPLATE                │ TESTEMUNHAS
─────────────────────────────────────────┼─────────────────────────┼──────────────
1. Baixar DOC/PDF (antes de assinar)     │ mista_2_testemunhas     │ ✅ SIM (2)
                                         │                         │
2. Gerar link assinatura digital         │ assinatura_digital      │ ❌ NÃO
   (ambos assinam 100% digital)          │                         │
                                         │                         │
3. Usuário assinou DIGITAL               │ mista_2_testemunhas     │ ✅ SIM (2)
   Comprador ainda não → Baixar PDF      │                         │
                                         │                         │
4. Ambos assinaram DIGITAL → Baixar PDF  │ assinatura_digital      │ ❌ NÃO
                                         │                         │
5. Usuário assinou MANUAL                │ manual_2_testemunhas    │ ✅ SIM (2)
   Comprador ainda não → Baixar PDF      │                         │
                                         │                         │
6. Ambos assinaram MANUAL → Baixar PDF   │ manual_2_testemunhas    │ ✅ SIM (2)
                                         │                         │
7. Usuário DIGITAL + Comprador MANUAL    │ mista_2_testemunhas     │ ✅ SIM (2)
   (fluxo misto) → Baixar PDF            │                         │
```

---

## Implementação

### Tipo para rastrear estado
```typescript
interface ContractSignatureState {
  usuarioAssinou: boolean;
  usuarioModalidade: 'digital' | 'manual';
  compradorAssinou: boolean;
  compradorModalidade: 'digital' | 'manual';
  modalidadeEscolhida: 'ambos_digitais' | 'mista' | 'ambos_manuais';
}
```

### Função para decidir testemunhas
```typescript
function precisaDeTestemunhas(state: ContractSignatureState): boolean {
  // Se qualquer parte assinar manualmente → precisa testemunhas
  if (state.usuarioModalidade === 'manual' || state.compradorModalidade === 'manual') {
    return true;
  }
  
  // Se todas vão assinar digitalmente → não precisa testemunhas
  return false;
}
```

### Função para resolver template
```typescript
function resolveTemplate(
  acao: 'download_antes' | 'download_depois' | 'link_assinatura',
  state?: ContractSignatureState
): string {
  // Caso 1: Baixar antes de assinar
  if (acao === 'download_antes') {
    return 'venda_vista_assinatura_manual_2_testemunhas.docx';
  }
  
  // Caso 2: Link de assinatura 100% digital
  if (acao === 'link_assinatura' && state?.modalidadeEscolhida === 'ambos_digitais') {
    return 'venda_vista_assinatura_digital.docx';
  }
  
  // Caso 3 e 5: Depois de assinar (verifica se precisa testemunhas)
  if (acao === 'download_depois') {
    if (precisaDeTestemunhas(state)) {
      return 'venda_vista_mista_2_testemunhas.docx';
    } else {
      return 'venda_vista_assinatura_digital.docx';
    }
  }
}
```

---

## Templates Disponíveis

```
📁 templates/
├─ venda_vista_assinatura_digital.docx
│  └─ SEM TESTEMUNHAS
│  └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}, {{COMPRADOR_ASSINATURA_DIGITAL}}
│
├─ venda_vista_assinatura_manual_2_testemunhas.docx
│  └─ COM 2 TESTEMUNHAS
│  └─ Tags: {{USUARIO_ASSINATURA_MANUAL}}, {{COMPRADOR_ASSINATURA_MANUAL}}
│
└─ venda_vista_mista_2_testemunhas.docx
   └─ COM 2 TESTEMUNHAS (Misto: Digital + Manual)
   └─ Tags: {{USUARIO_ASSINATURA_DIGITAL}}, {{COMPRADOR_ASSINATURA_MANUAL}}
```

---

## Resumo

1. **Regra Ouro:** Digital = sem testemunhas | Manual = com testemunhas
2. **Processamento:** Remove tags, insere selos digitais, mantém espaços para manual
3. **Download antes de assinar:** Sempre COM testemunhas (pior caso)
4. **Link digital:** SEM testemunhas (melhor caso)
5. **Download depois:** Depende de quem já assinou e como
6. **Nunca:** Tag de assinatura deve aparecer no PDF/Word final ao usuário

