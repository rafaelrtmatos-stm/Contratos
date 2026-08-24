# Catálogo Completo de Templates

## 📦 Estrutura

```
templates/
├── venda_vista_assinatura_digital.docx
├── venda_vista_assinatura_manual_2_testemunhas.docx
├── venda_vista_mista_2_testemunhas.docx
├── venda_parcelada_assinatura_digital.docx
├── venda_parcelada_assinatura_manual_2_testemunhas.docx
└── venda_parcelada_mista_2_testemunhas.docx
```

---

## VENDA À VISTA

### 1️⃣ `venda_vista_assinatura_digital.docx`
- **Testemunhas:** ❌ NÃO
- **Tipo de Assinatura:** Ambos DIGITAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  {{COMPRADOR_ASSINATURA_DIGITAL}}
  ```

### 2️⃣ `venda_vista_assinatura_manual_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Ambos MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_MANUAL}}
  {{COMPRADOR_ASSINATURA_MANUAL}}
  ```

### 3️⃣ `venda_vista_mista_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Você DIGITAL + Pessoa MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  {{COMPRADOR_ASSINATURA_MANUAL}}
  ```

---

## VENDA PARCELADA

### 4️⃣ `venda_parcelada_assinatura_digital.docx`
- **Testemunhas:** ❌ NÃO
- **Tipo de Assinatura:** Ambos DIGITAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  {{COMPRADOR_ASSINATURA_DIGITAL}}
  ```

### 5️⃣ `venda_parcelada_assinatura_manual_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Ambos MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_MANUAL}}
  {{COMPRADOR_ASSINATURA_MANUAL}}
  ```

### 6️⃣ `venda_parcelada_mista_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Você DIGITAL + Pessoa MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  {{COMPRADOR_ASSINATURA_MANUAL}}
  ```

---

## Matriz de Decisão (Qual Template Usar?)

```
TIPO CONTRATO │ AÇÃO                              │ TEMPLATE
──────────────┼──────────────────────────────────┼────────────────────────────────────
              │ 1. Baixar DOC antes de assinar   │ mista_2_testemunhas
VENDA À VISTA │ 2. Link assinatura 100% digital  │ assinatura_digital
              │ 3. Depois de assinar             │ Depende (digital/manual/mista)
──────────────┼──────────────────────────────────┼────────────────────────────────────
              │ 1. Baixar DOC antes de assinar   │ mista_2_testemunhas
PARCELADA     │ 2. Link assinatura 100% digital  │ assinatura_digital
              │ 3. Depois de assinar             │ Depende (digital/manual/mista)
```

---

## Regra de Ouro 🏆

```
Se TODAS as partes assinam DIGITAL   → SEM testemunhas
Se QUALQUER parte assina MANUAL      → COM 2 testemunhas
```

---

## Tags de Assinatura (Resumo)

| Tag | Processamento |
|-----|---|
| `{{USUARIO_ASSINATURA_DIGITAL}}` | Aguarda assinatura digital → Remove tag → Insere selo |
| `{{COMPRADOR_ASSINATURA_DIGITAL}}` | Aguarda assinatura digital → Remove tag → Insere selo |
| `{{USUARIO_ASSINATURA_MANUAL}}` | Remove tag → Deixa espaço branco para assinatura manual |
| `{{COMPRADOR_ASSINATURA_MANUAL}}` | Remove tag → Deixa espaço branco para assinatura manual |

---

## EXCLUSIVIDADE

### 7️⃣ `exclusividade_assinatura_digital.docx`
- **Testemunhas:** ❌ NÃO
- **Tipo de Assinatura:** Ambos DIGITAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  ```
- **Nota:** Usuário assina digital; Contratante assina digital (sem tag = espaço em branco)

### 8️⃣ `exclusividade_mista_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Você DIGITAL + Contratante MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  ```
- **Nota:** Usuário assina digital; Contratante assina manual (sem tag = espaço em branco)
- **Inclui:** 2 linhas para assinatura de testemunhas (manual)

### 9️⃣ `exclusividade_sem_conjuge_mista_2_testemunhas.docx`
- **Testemunhas:** ✅ SIM (2)
- **Tipo de Assinatura:** Você DIGITAL + Contratante MANUAL
- **Tags de Assinatura:**
  ```
  {{USUARIO_ASSINATURA_DIGITAL}}
  ```
- **Nota:** Variante SEM CÔNJUGE do contratante
- **Inclui:** 2 linhas para assinatura de testemunhas (manual)

---

## ⚠️ IMPORTANTE

- **NUNCA** as tags de assinatura devem aparecer no PDF/Word final entregue ao usuário
- **SEMPRE** preservar a posição da tag (selo digital OU espaço branco na mesma posição)
- **DIGITAL**: Tag removida + Selo digital inserido na posição
- **MANUAL**: Tag removida + Espaço branco mantido na posição
- **Testemunhas**: 2 espaços para assinatura manuscrita (sempre manual)

