-- ============================================================
-- Isola os buckets de Storage por usuário (dono) + acesso total
-- para admin. Necessário rodar isso porque os buckets
-- 'contract-documents' e 'contract-templates' foram criados
-- como PÚBLICOS: enquanto estiverem públicos, qualquer política
-- de RLS abaixo é ignorada e o arquivo é servido direto por URL,
-- sem checar quem está pedindo.
--
-- Confirmado antes de aplicar: nenhuma tela do app usa a URL
-- pública desses arquivos para abrir/baixar (tudo é feito via
-- download autenticado). O fluxo de assinatura por link do
-- cliente também não depende do Storage - ele lê os dados do
-- contrato via função no banco (get_contract_for_signature_token),
-- então continua funcionando normalmente.
-- ============================================================

-- 1) Buckets deixam de ser públicos
update storage.buckets set public = false where id in ('contract-documents', 'contract-templates');

-- Garantir que RLS está ativo na tabela de objetos do storage
alter table storage.objects enable row level security;

-- ============================================================
-- TABELA contracts: admin também precisa ver TODOS os contratos,
-- não só os próprios (a tabela já tem uma policy restringindo por
-- owner_id = auth.uid(); esta é uma policy ADICIONAL só para admin -
-- RLS combina policies permissivas com OR, então isso não remove
-- nada do que já existe, só abre exceção pra quem é admin).
-- ============================================================

drop policy if exists "contracts_select_admin_all" on public.contracts;
create policy "contracts_select_admin_all"
on public.contracts for select
using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- BUCKET: contract-documents
-- Caminho dos arquivos: contratos/{contractId}/{timestamp}_{nome}.docx
-- Regra: só o dono do contrato (contracts.owner_id) ou admin acessa.
-- ============================================================

drop policy if exists "contract_documents_select_owner_or_admin" on storage.objects;
create policy "contract_documents_select_owner_or_admin"
on storage.objects for select
using (
  bucket_id = 'contract-documents'
  and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2]::uuid in (
        select id from public.contracts where owner_id = auth.uid()
      )
    )
  )
);

drop policy if exists "contract_documents_insert_owner_or_admin" on storage.objects;
create policy "contract_documents_insert_owner_or_admin"
on storage.objects for insert
with check (
  bucket_id = 'contract-documents'
  and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2]::uuid in (
        select id from public.contracts where owner_id = auth.uid()
      )
    )
  )
);

drop policy if exists "contract_documents_delete_owner_or_admin" on storage.objects;
create policy "contract_documents_delete_owner_or_admin"
on storage.objects for delete
using (
  bucket_id = 'contract-documents'
  and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2]::uuid in (
        select id from public.contracts where owner_id = auth.uid()
      )
    )
  )
);

-- ============================================================
-- BUCKET: contract-templates
-- Dois tipos de arquivo:
--   - Templates oficiais (9 arquivos na raiz do bucket) -> leitura
--     liberada para qualquer usuário autenticado; escrita só admin.
--   - Templates personalizados (custom/{ownerId}/...) -> só o dono
--     ou admin, leitura e escrita.
-- ============================================================

drop policy if exists "contract_templates_select" on storage.objects;
create policy "contract_templates_select"
on storage.objects for select
using (
  bucket_id = 'contract-templates'
  and (
    (coalesce(array_length(storage.foldername(name), 1), 0) = 0 and auth.role() = 'authenticated')
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = 'custom'
      and (
        (storage.foldername(name))[2] = auth.uid()::text
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  )
);

drop policy if exists "contract_templates_insert" on storage.objects;
create policy "contract_templates_insert"
on storage.objects for insert
with check (
  bucket_id = 'contract-templates'
  and (
    (
      coalesce(array_length(storage.foldername(name), 1), 0) = 0
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = 'custom'
      and (
        (storage.foldername(name))[2] = auth.uid()::text
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  )
);

drop policy if exists "contract_templates_update" on storage.objects;
create policy "contract_templates_update"
on storage.objects for update
using (
  bucket_id = 'contract-templates'
  and (
    (
      coalesce(array_length(storage.foldername(name), 1), 0) = 0
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = 'custom'
      and (
        (storage.foldername(name))[2] = auth.uid()::text
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  )
)
with check (
  bucket_id = 'contract-templates'
  and (
    (
      coalesce(array_length(storage.foldername(name), 1), 0) = 0
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = 'custom'
      and (
        (storage.foldername(name))[2] = auth.uid()::text
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  )
);

drop policy if exists "contract_templates_delete" on storage.objects;
create policy "contract_templates_delete"
on storage.objects for delete
using (
  bucket_id = 'contract-templates'
  and (
    (
      coalesce(array_length(storage.foldername(name), 1), 0) = 0
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = 'custom'
      and (
        (storage.foldername(name))[2] = auth.uid()::text
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  )
);
