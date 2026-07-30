-- ============================================================
-- Migration 0008: doctor_availability
-- ============================================================
-- Antecipa do PR 2 a tabela de disponibilidade por dia/turno. Substitui
-- lib/triagem/day-router.ts, que hardcodeava "carol"/"cleyton"/"brendon"
-- como chaves de roteamento — string ids que deixam de existir com a
-- remoção de data/medicos.ts (PR 1).
--
-- Roteamento por agenda passa a ser uma query: dia/turno selecionado ->
-- doctor_availability JOIN doctors (is_active = true) -> menor
-- global_priority. Nenhum mapa hardcoded, nenhuma string id, nenhum match
-- por nome.
--
-- Tabela operacional interna: sem policy de leitura pública, só
-- service_role (mesmo padrão de patients/bookings/payments em
-- 0003_rls_hardening.sql).
-- ============================================================

create table doctor_availability (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=domingo
  period text not null check (period in ('manha', 'tarde', 'noite')),
  created_at timestamptz not null default now(),
  unique (doctor_id, weekday, period)
);

create index idx_doctor_availability_slot on doctor_availability (weekday, period);

alter table doctor_availability enable row level security;

create policy "deny_all_anon_authenticated_doctor_availability"
  on public.doctor_availability
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ============================================================
-- SEED: disponibilidade atual
-- ============================================================

insert into doctor_availability (doctor_id, weekday, period) values
  ('c4262d03-35a7-499f-ba06-7d1ecd086db9', 6, 'manha'), -- Cleyton, sábado manhã
  ('c4262d03-35a7-499f-ba06-7d1ecd086db9', 6, 'tarde'), -- Cleyton, sábado tarde
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 0, 'manha'), -- Brendon, domingo manhã
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 0, 'tarde'), -- Brendon, domingo tarde
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 1, 'noite'), -- Brendon, segunda noite
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 2, 'noite'), -- Brendon, terça noite
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 3, 'noite'), -- Brendon, quarta noite
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 4, 'noite'), -- Brendon, quinta noite
  ('f8dd4988-b441-466e-af6d-aeca5a3fd3e3', 5, 'noite'), -- Brendon, sexta noite
  ('7b74694a-b8f5-462a-9da2-75ce207ea786', 1, 'manha'), -- Carol, segunda manhã
  ('7b74694a-b8f5-462a-9da2-75ce207ea786', 5, 'manha'); -- Carol, sexta manhã

-- ============================================================
-- FIM DA MIGRATION 0008
-- ============================================================
