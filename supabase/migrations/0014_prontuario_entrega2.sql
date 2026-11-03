-- ============================================================
-- Migration 0014: Prontuário pós-pagamento (Entrega 2, bloco 1 de 2)
-- ============================================================
-- Aditiva e retrocompatível: colunas novas com default seguro, sem
-- alterar nem remover nada existente. Bookings do formulário antigo
-- (patientSchemaFull) nunca ganham intake_required=true, então não
-- entram em nenhuma regra nova de prontuário/cron.
-- ============================================================

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS intake_token text,
  ADD COLUMN IF NOT EXISTS intake_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz;

-- Único apenas entre valores não nulos — bookings do formulário antigo
-- nunca têm intake_token, então não competem por unicidade entre si.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_intake_token
  ON bookings (intake_token)
  WHERE intake_token IS NOT NULL;

-- Acelera o cron (Entrega 2, item 7): varredura por intake pendente.
CREATE INDEX IF NOT EXISTS idx_bookings_intake_pending
  ON bookings (scheduled_at)
  WHERE intake_required = true AND intake_completed_at IS NULL;

COMMIT;

-- ============================================================
-- FIM DA MIGRATION 0014
-- ============================================================
