-- ============================================================
-- Migration 0018: Funil — Entrega 3, item 2h (condição de corrida)
-- ============================================================
-- Roda em transação separada (mesmo padrão de 0013) — ALTER TYPE ...
-- ADD VALUE não deve compartilhar bloco com DDL que venha a referenciar
-- o valor novo.
--
-- Caso: pagamento foi aprovado, mas createCalcomBooking falhou porque o
-- horário já não estava mais livre no Cal.com (reserva ou booking real de
-- outra pessoa venceu a corrida). O paciente pagou e não pode perder esse
-- pagamento — mas também não existe consulta real agendada. 'payment_conflict'
-- marca esse booking para o time filtrar e resolver manualmente (nunca
-- estorno automático). Não reclassifica nenhum booking existente.
-- ============================================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_conflict';

-- ============================================================
-- FIM DA MIGRATION 0018
-- ============================================================
