-- ============================================================
-- Migration 0009: coupon_code on payments
-- ============================================================
-- amount_cents already existed (not always NEXT_PUBLIC_CONSULTATION_PRICE
-- anymore, now that generate-pix.ts can apply a coupon discount). Only
-- coupon_code is missing: the code applied to a given payment, or null
-- when the patient paid full price.
-- ============================================================

alter table payments add column if not exists coupon_code text;

-- ============================================================
-- FIM DA MIGRATION 0009
-- ============================================================
