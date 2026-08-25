-- ============================================================
-- Habilita Supabase Realtime na tabela contract_signatures.
--
-- Sem isso, a assinatura em tempo real na tela do corretor
-- (ContractViewer.tsx, canal `contract_signatures_<id>`) não recebe
-- nenhum evento quando o cliente assina pelo link dele em outro
-- aparelho - o corretor só veria a atualização dando F5 na página.
--
-- Alternativa sem rodar SQL: no Supabase Dashboard, ir em
-- Database > Replication > clicar na tabela contract_signatures e
-- ativar o toggle. Este script faz a mesma coisa via SQL.
--
-- Rodar no SQL Editor do projeto do app de contratos.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE contract_signatures;
