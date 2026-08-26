# Diagnóstico: Selos Desaparecem em Venda à Vista

## ✅ FIXES APLICADOS

### 1️⃣ **Pré-preenchimento de Foro e Data** 
- **Commit**: `5769c41`
- **O que faz**: Todo novo contrato já vem com Santarém/PA e data de hoje preenchida
- **Status**: ✅ Pronto e enviado para GitHub

### 2️⃣ **RPC para retornar assinaturas corretamente**
- **Migration**: `fix_venda_vista_selo`
- **O que faz**: O RPC `get_contract_for_signature_token` agora **busca e retorna as assinaturas já registradas** da tabela `contract_signatures`
- **Testado**: ✅ Verificado que retorna corretamente 2 assinaturas em contrato `assinado_total`
- **Status**: ✅ Rodado no Supabase

### 3️⃣ **Trigger para forçar atualização do Realtime**
- **Migration**: `fix_assinaturas_com_trigger`
- **O que faz**: Quando uma nova assinatura é inserida em `contract_signatures`, um TRIGGER atualiza o `updated_at` da linha em `contracts` para disparar Realtime e notificar o Dashboard
- **Status**: ✅ Rodado no Supabase

---

## 🔍 DIAGNÓSTICO DO PROBLEMA

### Cenário Reproduzível:
1. **Você assina** um contrato de venda à vista → `role: 'vendedor'` salvo em `contract_signatures`
2. **Cliente abre o link e assina** → `role: 'comprador'` salvo em `contract_signatures`
3. **Resultado**: ❌ Os selos desaparecem na prévia E no PDF baixado

### Causa Raiz Identificada:
O sistema estava retornando assinaturas vazias (`assinaturas: []`) mesmo quando estava salvando tudo corretamente no banco.

### Fluxo de Dados Antes dos Fixes:
```
Frontend → RPC get_contract_for_signature_token → Retorna contrato de contracts (sem assinaturas!)
                ↓
                Não busca de contract_signatures
                ↓
                assinaturas: [] (vazio!)
```

### Fluxo Esperado Depois dos Fixes:
```
Frontend → RPC get_contract_for_signature_token
                ↓
                Busca contracts (dados gerais)
                ↓
                Busca contract_signatures (assinaturas reais)
                ↓
                Retorna ambas juntas
                ↓
                Frontend renderiza com os 2 selos ✓
```

---

## 🧪 TESTES REALIZADOS

### ✅ Teste 1: RPC Retorna Assinaturas
```sql
SELECT get_contract_for_signature_token('54af332e7ea59d4a5bb275b983dda5fe'::text);
```
**Resultado**: Retornou 2 assinaturas corretamente (vendedor + comprador) ✓

### ✅ Teste 2: Banco Salva Assinaturas
```sql
SELECT numero_contrato, status, COUNT(*) as total_assinaturasW
FROM contracts c
LEFT JOIN contract_signatures cs ON c.id = cs.contract_id
WHERE tipo = 'venda_vista' AND status = 'assinado_total'
GROUP BY ...
```
**Resultado**: 2 contratos com 2 assinaturas cada ✓

---

## ❓ PRÓXIMAS INVESTIGAÇÕES

Se o problema **persistir** após os fixes, pode ser:

### Cenário A: Problema no Link do Cliente
- Cliente assina pelo link, selos desaparecem NA TELA DEL
E
- **Debug**: Verifique `browser console` para erros de `renderContractDocumentPdf`
- **Solução**: Pode ser timeout na Edge Function ou erro ao gerar PDF

### Cenário B: Problema no Dashboard do Corretor  
- Você assina, cliente assina, você vê os 2 selos MAS depois que cliente assina somem
- **Debug**: Verifique se o Realtime está disparando (deve aparecer no DevTools)
- **Solução**: O trigger `refresh_contract_on_signature_insert` força `updated_at` a mudar, disparando Realtime

### Cenário C: Cache/Renderização
- Selos aparecem corretos no início, mas desaparecem ao rolar a página
- **Debug**: Limpe cache do navegador (Ctrl+Shift+Delete)
- **Solução**: O realtime pode ter mudado, mas a view HTML foi cacheda

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

1. **Teste o fluxo completo** em um novo contrato de venda à vista:
   - [ ] Você assina
   - [ ] Cliente abre link e assina
   - [ ] Ambos baixam o PDF
   - [ ] Verifique se **ambos os selos aparecem**

2. **Se o problema persistir**, envie:
   - [ ] Screenshot do que está acontecendo (quais selos ficam/somem)
   - [ ] Console de erro (F12 → Console)
   - [ ] Número do contrato e timestamp exato

3. **Validações Finais**:
   - [ ] Teste em contratos com **múltiplos compradores** também
   - [ ] Teste na **exclusividade** (usa roles invertidas)

---

## 📝 ARQUIVOS CRIADOS

- `/home/claude/fix_venda_vista_selo.sql` - SQLs para os 2 primeiros fixes
- `/home/claude/test_assinaturas.sql` - Queries de debug
- `/mnt/user-data/outputs/fix_venda_vista_selo.sql` - Backup dos SQLs
