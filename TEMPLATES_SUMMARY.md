# Resumo de Templates - COMPLETO

## 🎯 Total: 9 Templates

```
VENDA À VISTA (3)
├─ venda_vista_assinatura_digital.docx
├─ venda_vista_assinatura_manual_2_testemunhas.docx
└─ venda_vista_mista_2_testemunhas.docx

VENDA PARCELADA (3)
├─ venda_parcelada_assinatura_digital.docx
├─ venda_parcelada_assinatura_manual_2_testemunhas.docx
└─ venda_parcelada_mista_2_testemunhas.docx

EXCLUSIVIDADE (3)
├─ exclusividade_assinatura_digital.docx
├─ exclusividade_mista_2_testemunhas.docx
└─ exclusividade_sem_conjuge_mista_2_testemunhas.docx
```

---

## 📊 Matriz Rápida

| Tipo | Digital | Manual | Mista | Variante |
|------|---------|--------|-------|----------|
| **Venda Vista** | ✅ | ✅ | ✅ | — |
| **Venda Parcelada** | ✅ | ✅ | ✅ | — |
| **Exclusividade** | ✅ | — | ✅ | ✅ sem cônjuge |

---

## 🏷️ Tags de Assinatura

```
VENDA À VISTA / PARCELADA:
  {{USUARIO_ASSINATURA_DIGITAL}}
  {{USUARIO_ASSINATURA_MANUAL}}
  {{COMPRADOR_ASSINATURA_DIGITAL}}
  {{COMPRADOR_ASSINATURA_MANUAL}}

EXCLUSIVIDADE:
  {{USUARIO_ASSINATURA_DIGITAL}}
  (Contratante não tem tag → espaço em branco)
```

---

## 🎯 Regra de Ouro

```
✅ Se TODOS assinam DIGITAL    → SEM testemunhas
✅ Se QUALQUER UM assina MANUAL → COM 2 testemunhas
```

---

## 💾 Estrutura Arquivo

```
/home/claude/contratos/templates/
├── venda_vista_assinatura_digital.docx (28K)
├── venda_vista_assinatura_manual_2_testemunhas.docx (28K)
├── venda_vista_mista_2_testemunhas.docx (28K)
├── venda_parcelada_assinatura_digital.docx (32K)
├── venda_parcelada_assinatura_manual_2_testemunhas.docx (33K)
├── venda_parcelada_mista_2_testemunhas.docx (33K)
├── exclusividade_assinatura_digital.docx (57K)
├── exclusividade_mista_2_testemunhas.docx (57K)
└── exclusividade_sem_conjuge_mista_2_testemunhas.docx (57K)
```

---

## 📝 Próximas Etapas

**CÓDIGO:**
- [ ] Sistema de decisão de templates
- [ ] Processamento de tags de assinatura
- [ ] Integração de assinatura digital (signatário)
- [ ] Geração de PDF/DOCX final

**DADOS:**
- [ ] Lista completa de tags de dados (vendedor, comprador, imóvel, financeiro)
- [ ] Validação de dados no formulário
- [ ] Mapeamento tag → campo do formulário

**TESTES:**
- [ ] Verificar se todos os templates carregam corretamente
- [ ] Testar processamento de tags
- [ ] Validar geração de DOCX com dados

