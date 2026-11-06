-- ============================================================
-- Migration 0017: Identidade do paciente, separada do responsável
-- ============================================================
-- Problema: sob LIGHT_FORM_ENABLED, `patients` é deduplicada pelo CPF de
-- quem faz o agendamento (o RESPONSÁVEL/contato) — não necessariamente de
-- quem será atendido (o PACIENTE). O prontuário (/prontuario/[token])
-- grava RG/nascimento/endereço do paciente. Antes desta migração, esses
-- dados eram escritos diretamente na linha `patients` do responsável
-- (submit-intake.ts) — se o responsável agendar para outra pessoa (ex.:
-- um filho), o cadastro do PRÓPRIO responsável seria sobrescrito com os
-- dados de um paciente diferente, e a próxima vez que esse mesmo CPF
-- aparecer (um novo agendamento, para si mesmo ou para outro dependente),
-- o dedupe por CPF encontraria essa mesma linha "contaminada".
--
-- Correção aditiva: os dados específicos do paciente passam a viver no
-- próprio booking, não mais na linha compartilhada `patients`. Todas as
-- colunas são nullable, sem default que mude linhas existentes — bookings
-- do formulário antigo (patientSchemaFull) nunca preenchem estas colunas
-- porque, nesse fluxo, paciente e responsável já são a mesma pessoa e
-- seus dados continuam só em `patients`, como sempre foi.
-- ============================================================

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS patient_full_name text,
  ADD COLUMN IF NOT EXISTS patient_cpf text,
  ADD COLUMN IF NOT EXISTS patient_rg text,
  ADD COLUMN IF NOT EXISTS patient_birth_date date,
  ADD COLUMN IF NOT EXISTS patient_address_street text,
  ADD COLUMN IF NOT EXISTS patient_address_number text,
  ADD COLUMN IF NOT EXISTS patient_address_complement text,
  ADD COLUMN IF NOT EXISTS patient_address_district text,
  ADD COLUMN IF NOT EXISTS patient_address_city text,
  ADD COLUMN IF NOT EXISTS patient_address_state text,
  ADD COLUMN IF NOT EXISTS patient_address_zipcode text;

COMMIT;

-- ============================================================
-- FIM DA MIGRATION 0017
-- ============================================================
