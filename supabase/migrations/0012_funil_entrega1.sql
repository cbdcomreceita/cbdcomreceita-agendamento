-- ============================================================
-- Migration 0012: Funil — Entrega 1 (bloco 1 de 2)
-- ============================================================
-- Formulário leve de /dados (atrás de LIGHT_FORM_ENABLED): RG, data de
-- nascimento e endereço completo passam a ser pedidos só no prontuário
-- (Entrega 2), não mais em /dados. CPF continua obrigatório — não muda.
--
-- whatsapp_consent: novo checkbox de consentimento em /dados, obrigatório
-- nas duas versões do formulário (atual e leve).
--
-- payment_token: token aleatório não adivinhável para reabrir o mesmo PIX
-- via /pagamento/[token] sem regenerar.
--
-- idx_bookings_dedupe: suporta createBooking reaproveitando o booking
-- awaiting_payment existente do mesmo paciente+médico+horário em vez de
-- criar um novo a cada refresh de /pagamento.
--
-- Não migra registros antigos — linhas existentes continuam como estão.
-- ============================================================

BEGIN;

alter table patients
  alter column rg drop not null,
  alter column birth_date drop not null,
  alter column address_street drop not null,
  alter column address_number drop not null,
  alter column address_district drop not null,
  alter column address_city drop not null,
  alter column address_state drop not null,
  alter column address_zipcode drop not null,
  add column if not exists whatsapp_consent boolean not null default false;

alter table payments
  add column if not exists payment_token text;

create unique index if not exists idx_payments_payment_token
  on payments(payment_token) where payment_token is not null;

create index if not exists idx_bookings_dedupe
  on bookings(patient_id, doctor_id, scheduled_at)
  where status = 'awaiting_payment';

COMMIT;

-- ============================================================
-- FIM DA MIGRATION 0012 — ver 0013 para o bloco 2 (ALTER TYPE), que
-- precisa rodar em transação separada.
-- ============================================================
