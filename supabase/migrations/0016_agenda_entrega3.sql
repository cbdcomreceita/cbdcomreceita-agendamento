-- ============================================================
-- Migration 0016: Próximas 3 agendas + reserva de horário (Entrega 3)
-- ============================================================
-- Aditiva: só uma coluna nova, nullable, sem default que mude linhas
-- existentes. Bookings de antes da Entrega 3 simplesmente nunca têm
-- calcom_reservation_uid, e nada no código trata isso como obrigatório.
-- ============================================================

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS calcom_reservation_uid text;

COMMIT;

-- ============================================================
-- FIM DA MIGRATION 0016
-- ============================================================
