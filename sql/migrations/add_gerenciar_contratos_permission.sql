-- ============================================================
-- Adiciona a permissão "gerenciar_contratos" (criar/editar contratos),
-- separada da já existente "excluir_contratos" (só excluir).
--
-- JÁ APLICADA diretamente no banco em 2026-08-25. Este arquivo é só
-- o registro/histórico da mudança, para consistência com as outras
-- migrations do projeto.
-- ============================================================

ALTER TABLE profiles ALTER COLUMN permissions SET DEFAULT '{
  "ver_financeiro": true,
  "gerenciar_contratos": true,
  "excluir_contratos": true,
  "gerenciar_templates": false,
  "gerenciar_usuarios": false
}'::jsonb;

-- Usuários já existentes ganham a permissão habilitada por padrão
-- (mantém o acesso que já tinham antes dessa permissão existir).
UPDATE profiles
SET permissions = permissions || '{"gerenciar_contratos": true}'::jsonb
WHERE NOT (permissions ? 'gerenciar_contratos');
