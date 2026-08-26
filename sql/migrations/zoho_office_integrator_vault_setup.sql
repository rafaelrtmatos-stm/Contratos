-- ============================================================
-- Integração com Zoho Office Integrator (editor de Word completo
-- online - fonte, negrito, parágrafos, tabelas etc).
--
-- JÁ APLICADA diretamente no banco em 2026-08-25 (a chave de API real
-- foi inserida direto via SQL, não fica registrada neste arquivo por
-- segurança). Este arquivo documenta a estrutura criada.
-- ============================================================

-- Guarda a chave de API da Zoho e um segredo próprio (usado pra validar
-- que o callback de "salvar" realmente veio da Zoho) - nunca em texto
-- puro no código, só criptografados no Vault do Supabase.
--
-- select vault.create_secret('<CHAVE_DE_API_DA_ZOHO>', 'zoho_office_integrator_apikey', 'Chave de API do Zoho Office Integrator (editor de Word online)');
-- select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'zoho_save_callback_secret', 'Segredo pra validar que a chamada de save veio mesmo da Zoho');

-- Função que lê um segredo do Vault - só o service_role (usado pelas
-- Edge Functions) pode chamar, nunca o app direto do navegador.
CREATE OR REPLACE FUNCTION get_vault_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_vault_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_vault_secret(TEXT) TO service_role;
