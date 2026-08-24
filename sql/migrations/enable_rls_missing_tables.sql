-- Habilita RLS em tabelas que já possuem policies criadas, mas RLS desabilitado
-- (detectado pelo Supabase Database Linter: rls_disabled_in_public / policy_exists_rls_disabled)

alter table public.clientes enable row level security;
alter table public.empreendimentos enable row level security;
alter table public.vendas enable row level security;
alter table public.app_config enable row level security;
alter table public.local_users enable row level security;
