-- ============================================================
-- Já aplicada diretamente no banco (via MCP Supabase) em 24/08/2026.
-- Este arquivo é só o registro/versionamento do que foi feito.
--
-- Contexto: o link de assinatura do cliente ganhou a opção de baixar
-- o documento FINAL já salvo no Storage (contract.documentoStoragePath),
-- em vez de sempre gerar um PDF novo na hora. Como o bucket
-- 'contract-documents' ficou PRIVADO na migration anterior
-- (storage_rls_per_user.sql), um cliente anônimo não tinha mais
-- nenhuma forma de acessar esse arquivo - nem a "URL pública" antiga
-- funcionava mais (bucket privado não serve nada por URL pública,
-- independente de RLS).
-- ============================================================

-- Colunas que o código já esperava existir, mas nunca tinham sido criadas
alter table public.contracts add column if not exists documento_url text;
alter table public.contracts add column if not exists documento_storage_path text;
alter table public.contracts add column if not exists documento_salvo_em timestamptz;

-- Cliente anônimo (via link de assinatura) pode LER o documento salvo no
-- Storage, mas SÓ para contratos que tenham um link de assinatura ainda
-- válido (não expirado) apontando pra eles. Não abre acesso geral ao
-- bucket - só aos documentos de contratos com link ativo. O acesso real
-- ainda passa por um link ASSINADO (temporário) gerado sob demanda via
-- getSignedDocumentUrl() - esta policy só permite que esse link seja
-- gerado com sucesso.
drop policy if exists "contract_documents_select_via_valid_link" on storage.objects;
create policy "contract_documents_select_via_valid_link"
on storage.objects for select
to anon
using (
  bucket_id = 'contract-documents'
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2]::uuid in (
    select contract_id from public.contract_signature_links where validade > now()
  )
);

-- Cliente também precisa poder ENVIAR o PDF assinado pra pasta clientes/,
-- não só ler - mesma trava de validade do link.
drop policy if exists "contract_documents_insert_client_via_valid_link" on storage.objects;
create policy "contract_documents_insert_client_via_valid_link"
on storage.objects for insert
to anon
with check (
  bucket_id = 'contract-documents'
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[1] = 'clientes'
  and (storage.foldername(name))[2]::uuid in (
    select contract_id from public.contract_signature_links where validade > now()
  )
);
