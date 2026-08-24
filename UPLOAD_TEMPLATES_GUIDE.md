# 📤 Guia: Upload de Templates para Supabase

## Pré-requisitos

```
✅ 9 templates .docx no diretório /templates
✅ Projeto Supabase criado
✅ Service Key do Supabase (para script)
```

---

## Opção 1️⃣: Upload Manual (via Supabase Dashboard)

### Passos

1. **Ir para Supabase Dashboard**
   - https://app.supabase.com → Seu Projeto

2. **Criar Bucket (se não existe)**
   - Ir para **Storage** → **New Bucket**
   - Nome: `contract-templates`
   - Visibility: **Public** (para poder gerar URLs públicas)
   - Click **Create Bucket**

3. **Upload dos arquivos**
   - Abrir bucket `contract-templates`
   - Click **Upload** ou arrastar arquivos
   - Selecionar todos os 9 templates:
     ```
     venda_vista_assinatura_digital.docx
     venda_vista_assinatura_manual_2_testemunhas.docx
     venda_vista_mista_2_testemunhas.docx
     venda_parcelada_assinatura_digital.docx
     venda_parcelada_assinatura_manual_2_testemunhas.docx
     venda_parcelada_mista_2_testemunhas.docx
     exclusividade_assinatura_digital.docx
     exclusividade_mista_2_testemunhas.docx
     exclusividade_sem_conjuge_mista_2_testemunhas.docx
     ```

4. **Pronto!** ✅
   - Sistema agora pode recuperar templates via `downloadTemplate()`

---

## Opção 2️⃣: Upload via Script (automático)

### Configuração

1. **Adicionar Service Key ao `.env`**
   ```
   # .env
   SUPABASE_SERVICE_KEY="seu_service_key_aqui"
   ```

   Onde encontrar?
   - Supabase Dashboard → Settings → API
   - Copiar `service_role` key

2. **Instalar dependências** (se não tiver)
   ```bash
   npm install supabase dotenv
   ```

3. **Executar script**
   ```bash
   npx tsx scripts/uploadTemplates.ts
   ```

4. **Resultado esperado**
   ```
   📦 Iniciando upload de 9 templates para Supabase...
   
   ✅ venda_vista_assinatura_digital.docx (28.45KB)
   ✅ venda_vista_assinatura_manual_2_testemunhas.docx (28.50KB)
   ✅ venda_vista_mista_2_testemunhas.docx (28.40KB)
   ✅ venda_parcelada_assinatura_digital.docx (32.10KB)
   ✅ venda_parcelada_assinatura_manual_2_testemunhas.docx (33.20KB)
   ✅ venda_parcelada_mista_2_testemunhas.docx (33.15KB)
   ✅ exclusividade_assinatura_digital.docx (57.50KB)
   ✅ exclusividade_mista_2_testemunhas.docx (57.45KB)
   ✅ exclusividade_sem_conjuge_mista_2_testemunhas.docx (57.40KB)
   
   🎉 Todos os templates foram enviados com sucesso!
   ```

---

## Opção 3️⃣: Upload Local (para testes)

Se quiser testar localmente **sem Supabase**:

1. **Salvar templates em localStorage**
   ```typescript
   // Usar localStorage como fallback
   const blob = ... // template carregado localmente
   localStorage.setItem(
     'template_venda_vista_digital',
     URL.createObjectURL(blob)
   );
   ```

2. **Atualizar `supabaseTemplateStorage.ts`**
   ```typescript
   export async function downloadTemplate(arquivoNome: string) {
     // Tentar localStorage primeiro
     const localUrl = localStorage.getItem(`template_${arquivoNome}`);
     if (localUrl) {
       const response = await fetch(localUrl);
       return { sucesso: true, blob: await response.blob() };
     }
     
     // Fallback: Supabase
     return downloadFromSupabase(arquivoNome);
   }
   ```

---

## ✅ Verificação

Após upload, verificar se tudo está correto:

### Via Supabase Dashboard
1. Ir para Storage → contract-templates
2. Deve listar 9 arquivos `.docx`
3. Click em um arquivo → Copy public URL
4. Deve retornar URL tipo:
   ```
   https://uftxcwcryqpkfdfxzlno.supabase.co/storage/v1/object/public/contract-templates/venda_vista_assinatura_digital.docx
   ```

### Via Código
```typescript
import { listTemplates } from '@/utils/supabaseTemplateStorage';

const { sucesso, templates } = await listTemplates();
console.log(templates); // Deve listar 9 arquivos
```

---

## 🔐 Segurança

### ⚠️ NUNCA commitar:
- ❌ SUPABASE_SERVICE_KEY no GitHub
- ❌ Variáveis de ambiente sensíveis em `.env.local`

### ✅ Usar:
- `SUPABASE_SERVICE_KEY` apenas localmente para script
- `VITE_SUPABASE_ANON_KEY` é segura de expor (use em produção)

### Exemplo `.env` seguro:
```
# .env.local (NÃO commitar)
SUPABASE_SERVICE_KEY="..."

# .env (seguro commitar)
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_ANON_KEY="..."
```

---

## 🚨 Problemas Comuns

### "Bucket não encontrado"
```
Solução: Criar bucket 'contract-templates' no Supabase Dashboard
```

### "Erro de permissão ao fazer upload"
```
Solução: Usar Service Key (não Anon Key) no script
Verifique: SUPABASE_SERVICE_KEY está configurado
```

### "Templates não aparecem no dashboard"
```
Solução: Dar refresh na página (F5)
Verificar: Bucket é público?
```

### "CORS error ao baixar template"
```
Solução: Usar Anon Key (não Service Key) no cliente
Verificar: Bucket é público?
```

---

## 📊 Resumo

| Método | Quando | Facilidade |
|--------|--------|-----------|
| Manual (Dashboard) | Setup inicial | ⭐⭐⭐ (fácil) |
| Script | Automatizar | ⭐⭐ (requer Node) |
| Local (localStorage) | Testes/dev | ⭐ (provisório) |

---

## ✨ Próximos Passos

Após upload:
1. ✅ Testar `downloadTemplate()` recupera arquivos
2. ✅ Integrar `resolveTemplate()` em ContractViewer
3. ✅ Implementar processamento de tags de assinatura
4. ✅ Gerar PDF/DOCX final

