-- ============================================================
-- Migration 0015: Prontuário pós-pagamento (Entrega 2, bloco 2 de 2)
-- ============================================================
-- Roda em transação separada de 0014 — ALTER TYPE ... ADD VALUE não deve
-- compartilhar bloco com DDL que venha a referenciar o valor novo.
--
-- Dois tipos novos, usados só pelo cron de prontuário pendente
-- (app/api/cron/funnel), e só para bookings com intake_required=true:
--   intake_reminder_12h — lembrete por WhatsApp, 12h antes da consulta.
--   intake_pending_2h   — alerta interno (e-mail médico + equipe), 2h antes.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'intake_reminder_12h';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'intake_pending_2h';

-- ============================================================
-- FIM DA MIGRATION 0015
-- ============================================================
