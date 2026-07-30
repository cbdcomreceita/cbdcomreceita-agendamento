-- ============================================================
-- Migration 0007: document medical_specialty column
-- ============================================================
-- A coluna já existe em produção — foi adicionada via ALTER TABLE direto
-- no SQL Editor do Supabase, fora do fluxo de migrations. Esta migration
-- só registra o schema real no repo. Idempotente e sem backfill: os 3
-- médicos ativos já têm o valor setado em produção:
--   Dra. Carolina Lopes                       -> 'Psiquiatria'
--   Dr. Cleyton Rosário de Souza               -> 'Clínico Geral'
--   Dr. Brendon Richard Boasquivesqui M. Paes  -> 'Clínico Geral'
-- ============================================================

alter table doctors add column if not exists medical_specialty text;

-- ============================================================
-- FIM DA MIGRATION 0007
-- ============================================================
