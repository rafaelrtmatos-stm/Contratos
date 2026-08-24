# Setup: Salvamento de Contratos em Supabase

## 1️⃣ Criar bucket no Supabase Storage

Acesse: https://app.supabase.com/project/uftxcwcryqpkfdfxzlno/storage/buckets

Clique em **"New bucket"** e configure:
- **Nome:** `contract-documents`
- **Public (não privado):** ✅ SIM
- **File size limit:** 100 MB
- **Allowed MIME types:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Clique em **"Create bucket"**

## 2️⃣ Executar migração SQL

Acesse: https://app.supabase.com/project/uftxcwcryqpkfdfxzlno/sql/new

Cole o conteúdo do arquivo:
```
sql/migrations/create_contract_documents.sql
```

Execute os comandos:
1. Criar tabela `contract_documents`
2. Criar índices
3. Ativar RLS (Row Level Security)
4. Criar policies
5. Adicionar colunas em `contracts` (se não existirem)

## 3️⃣ Verificar resultado

### No Dashboard Supabase:
✅ Nova tabela `contract_documents` deve aparecer
✅ Bucket `contract-documents` ativo
✅ Colunas adicionadas em `contracts`:
   - `documento_url` (TEXT)
   - `documento_salvo_em` (TIMESTAMP)

### Teste no app:
1. Criar novo contrato
2. Preencher dados
3. Clique em **"Baixar DOC"**
4. Aguarde a mensagem:
   ```
   ✅ Cópia salva com sucesso no Supabase!
   ```

5. Verifique no Supabase:
   - Storage > contract-documents
   - Verá: `contratos/{contratoId}/{timestamp}_{fileName}.docx`
   - Table > contract_documents
   - Verá novo registro com metadados

## 🔧 Troubleshooting

### "Erro ao fazer upload: Unauthorized"
- Verifique se bucket é **PUBLIC**
- Verifique permissões RLS

### "Arquivo baixado mas não salvo no Supabase"
- Verifique conexão com Supabase
- Verifique logs no Console (F12)
- O download local ainda funciona (não bloqueia)

### Dados não aparecem em contract_documents
- Verifique se a migração SQL foi executada completamente
- Verifique se usuário está autenticado

## 📊 Schema da tabela contract_documents

```sql
id                  UUID (PK)
contract_id         UUID (FK) 
file_name           VARCHAR
storage_path        VARCHAR (UNIQUE)
public_url          TEXT
size_bytes          BIGINT
tipo_contrato       VARCHAR (venda_vista, venda_parcelada, exclusividade)
vendedor_nome       VARCHAR
comprador_nome      VARCHAR
valor_contrato      DECIMAL(15,2)
created_at          TIMESTAMP (auto)
updated_at          TIMESTAMP (auto)
```

## 🔒 Segurança (RLS policies)

Usuários podem:
- ✅ Ver documentos de seus próprios contratos
- ✅ Inserir documentos em seus contratos
- ✅ Deletar documentos de seus contratos
- ❌ Ver documentos de contratos de outros usuários

## 📈 Próximas funcionalidades

- [ ] Listar versões anteriores de cada contrato
- [ ] Download de versão anterior
- [ ] Deletar versão específica
- [ ] Adicionar assinatura digital no PDF

---

**Status:** Setup concluído ✅
