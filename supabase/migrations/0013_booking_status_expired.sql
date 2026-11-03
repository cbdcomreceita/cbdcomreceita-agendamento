-- ============================================================
-- Migration 0013: Funil — Entrega 1 (bloco 2 de 2)
-- ============================================================
-- Roda em transação separada de 0012 — ALTER TYPE ... ADD VALUE não deve
-- compartilhar bloco com DDL que venha a referenciar o valor novo.
--
-- Distingue PIX vencido por inação (booking fica 'expired') de pagamento
-- recusado pelo banco (booking continua 'cancelled', como já era).
-- Não reclassifica bookings 'cancelled' antigos.
-- ============================================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';

-- ============================================================
-- FIM DA MIGRATION 0013
-- ============================================================
