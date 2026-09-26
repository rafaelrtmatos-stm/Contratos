-- Sistema de autenticação local para o app "contratos", independente do
-- Supabase Auth. Espelha a tabela `local_users` já usada pelo app
-- "rumo-ao-milhao" no mesmo projeto Supabase (RafaelTavaresCorretor).
--
-- Motivo: o Supabase Auth nativo (supabase.auth.signInWithPassword) deste
-- projeto está sofrendo alguma restrição/bloqueio que impede o login do
-- app "contratos", enquanto "rumo-ao-milhao" segue funcionando porque já
-- não depende do Supabase Auth para autenticar (usa local_users).
--
-- IMPORTANTE: esta tabela só é acessível pelo backend (funções
-- serverless da Vercel usando a SUPABASE_SERVICE_ROLE_KEY). RLS fica
-- habilitado e, de propósito, SEM NENHUMA policy — isso nega acesso a
-- `anon`/`authenticated` por padrão, então nem o client Supabase do
-- navegador (que usa a anon key) consegue ler/escrever aqui.
--
-- Isso resolve o LOGIN. A leitura/gravação de dados (contracts,
-- templates, contract_signature_links, etc.) continua, por enquanto,
-- dependendo do Supabase Auth (RLS baseada em auth.uid()) — migrar isso
-- também é um trabalho à parte, ainda não feito.

create table if not exists public.app_users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password_hash text not null,
  is_admin boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

-- Nenhuma policy é criada de propósito: com RLS habilitado e zero
-- policies, toda linha fica inacessível para os papéis `anon` e
-- `authenticated`. Somente conexões com a service_role key (usada nas
-- funções serverless em /api/auth/*) enxergam esta tabela, pois
-- service_role ignora RLS.

create index if not exists app_users_email_idx on public.app_users (lower(email));
