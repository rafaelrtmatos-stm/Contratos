-- ============================================================
-- Lixeira de contratos: soft-delete com restauração e expurgo
-- automático depois de 30 dias.
--
-- - "Excluir" um contrato passa a só marcar deleted_at = NOW(),
--   nunca apaga a linha na hora.
-- - Um contrato marcado pode ser restaurado (deleted_at = NULL) a
--   qualquer momento antes de completar 30 dias.
-- - purge_expired_trashed_contracts() apaga definitivamente (DELETE
--   de verdade) o que já passou de 30 dias na lixeira. É chamada
--   toda vez que a lixeira é aberta no app (expurgo preguiçoso) e,
--   se o pg_cron estiver disponível neste projeto, também roda
--   sozinha 1x por dia.
--
-- Rodar no SQL Editor do projeto do app de contratos.
-- ============================================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts (deleted_at);

CREATE OR REPLACE FUNCTION purge_expired_trashed_contracts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM contracts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
$$;

GRANT EXECUTE ON FUNCTION purge_expired_trashed_contracts() TO authenticated, anon;

-- Agendamento automático diário via pg_cron, se a extensão estiver
-- disponível neste projeto. Se não estiver (ou a extensão não puder
-- ser habilitada por qualquer motivo), o expurgo continua acontecendo
-- de forma preguiçosa (toda vez que alguém abre a lixeira no app) -
-- então isso é só um reforço, não uma dependência.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- sem permissão/indisponível neste projeto - segue sem cron
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge_expired_trashed_contracts';
    PERFORM cron.schedule(
      'purge_expired_trashed_contracts',
      '0 6 * * *', -- todo dia às 06:00 UTC (03:00 em Brasília)
      $c$ SELECT purge_expired_trashed_contracts(); $c$
    );
  END IF;
END $$;
