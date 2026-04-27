-- ============================================================
-- CBD com Receita — Schema inicial (v2)
-- Migration: 0001_initial_schema
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- TIPOS CUSTOMIZADOS
-- ============================================================

create type booking_status as enum (
  'awaiting_payment', 'confirmed', 'cancelled',
  'completed', 'no_show', 'rescheduled'
);

create type payment_status as enum (
  'pending', 'approved', 'rejected', 'refunded', 'expired'
);

create type notification_channel as enum ('whatsapp', 'email', 'sms');

create type notification_type as enum (
  'booking_confirmation', 'reminder_24h', 'reminder_1h',
  'payment_pending', 'payment_failed', 'cancellation', 'rescheduled'
);

create type notification_status as enum ('queued', 'sent', 'delivered', 'failed');

-- ============================================================
-- TABELA: config (chave-valor pra settings alteráveis)
-- ============================================================

create table config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into config (key, value, description) values
  ('consultation_price_cents', '4990', 'Preço da consulta em centavos (R$49,90)'),
  ('consultation_duration_minutes', '25', 'Duração da consulta em minutos'),
  ('min_age', '0', 'Idade mínima permitida (0 = sem limite)'),
  ('booking_buffer_minutes', '15', 'Buffer entre consultas'),
  ('booking_min_notice_hours', '24', 'Antecedência mínima pra agendar'),
  ('no_show_rule_minutes', '10', 'Minutos de atraso pra considerar no-show');

-- ============================================================
-- TABELA: doctors
-- ============================================================

create table doctors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  crm text not null,
  crm_uf text not null check (length(crm_uf) = 2),
  specialties text[] not null default '{}',
  bio_short text,
  photo_url text,
  email text not null unique,
  calcom_event_type_slug text,
  calcom_event_type_id bigint,
  global_priority int not null default 99,  -- 1=Carol, 2=Magno (Lilian inativa)
  handles_minors boolean not null default false,  -- < 18 anos
  handles_elderly boolean not null default false, -- > 65 anos
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_doctors_active on doctors(is_active) where is_active = true;
create index idx_doctors_priority on doctors(global_priority);

-- ============================================================
-- TABELA: symptoms
-- ============================================================

create table symptoms (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  label text not null,
  description text,
  category text,
  is_emergency boolean not null default false,
  emergency_message text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_symptoms_active on symptoms(is_active, display_order) where is_active = true;

-- ============================================================
-- TABELA: symptom_doctor_map (N:N)
-- ============================================================

create table symptom_doctor_map (
  symptom_id uuid not null references symptoms(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete cascade,
  priority int not null default 1,
  primary key (symptom_id, doctor_id)
);

create index idx_sdm_doctor on symptom_doctor_map(doctor_id);

-- ============================================================
-- TABELA: patients (TODOS os campos obrigatórios)
-- ============================================================

create table patients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null,
  phone text not null,
  cpf text not null,
  rg text not null,
  birth_date date not null,
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_district text not null,
  address_city text not null,
  address_state text not null check (length(address_state) = 2),
  address_zipcode text not null,
  -- Dados clínicos do quiz
  selected_symptoms text[] not null default '{}',
  current_medications text,
  has_current_medication boolean not null default false,
  prior_cbd_use text, -- 'never', 'with_prescription', 'without_prescription', 'prefer_not_say'
  patient_notes text,
  -- LGPD
  lgpd_consent_at timestamptz not null,
  terms_consent_at timestamptz not null,
  lgpd_consent_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_patients_cpf on patients(cpf);
create index idx_patients_email on patients(email);
create index idx_patients_phone on patients(phone);

-- ============================================================
-- TABELA: bookings
-- ============================================================

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references doctors(id),
  status booking_status not null default 'awaiting_payment',
  scheduled_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  meet_link text,
  calcom_booking_id bigint,
  calcom_booking_uid text,
  triage_data jsonb not null default '{}'::jsonb,
  cancellation_reason text,
  cancelled_at timestamptz,
  rescheduled_from_booking_id uuid references bookings(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_patient on bookings(patient_id);
create index idx_bookings_doctor on bookings(doctor_id);
create index idx_bookings_status on bookings(status);
create index idx_bookings_scheduled on bookings(scheduled_at);

-- ============================================================
-- TABELA: payments
-- ============================================================

create table payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount_cents int not null,
  currency text not null default 'BRL',
  method text not null default 'pix',
  status payment_status not null default 'pending',
  mp_preference_id text,
  mp_payment_id bigint,
  mp_qr_code text,
  mp_qr_code_base64 text,
  mp_ticket_url text,
  external_reference text unique,
  paid_at timestamptz,
  expires_at timestamptz,
  refunded_at timestamptz,
  raw_webhook_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_booking on payments(booking_id);
create index idx_payments_status on payments(status);
create index idx_payments_mp_payment on payments(mp_payment_id);

-- ============================================================
-- TABELA: notifications_log
-- ============================================================

create table notifications_log (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  channel notification_channel not null,
  type notification_type not null,
  status notification_status not null default 'queued',
  recipient text not null,
  template_name text,
  payload jsonb,
  provider_response jsonb,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_booking on notifications_log(booking_id);
create index idx_notifications_status on notifications_log(status);

-- ============================================================
-- TABELA: audit_events (LGPD compliance)
-- ============================================================

create table audit_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  actor_type text,
  actor_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on audit_events(entity_type, entity_id);
create index idx_audit_created on audit_events(created_at desc);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_doctors before update on doctors
  for each row execute function update_updated_at_column();
create trigger set_updated_at_patients before update on patients
  for each row execute function update_updated_at_column();
create trigger set_updated_at_bookings before update on bookings
  for each row execute function update_updated_at_column();
create trigger set_updated_at_payments before update on payments
  for each row execute function update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================

alter table config enable row level security;
alter table doctors enable row level security;
alter table symptoms enable row level security;
alter table symptom_doctor_map enable row level security;
alter table patients enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table notifications_log enable row level security;
alter table audit_events enable row level security;

-- Dados públicos (aparecem no site)
create policy "config_public_read" on config for select using (true);
create policy "doctors_public_read" on doctors for select using (is_active = true);
create policy "symptoms_public_read" on symptoms for select using (is_active = true);
create policy "sdm_public_read" on symptom_doctor_map for select using (true);

-- ============================================================
-- SEED: Médicos
-- ============================================================

insert into doctors (name, crm, crm_uf, specialties, bio_short, email, calcom_event_type_slug, global_priority, handles_minors, handles_elderly) values
  (
    'Dra. Carolina Lopes',
    '215691', 'SP',
    ARRAY['ansiedade', 'insônia', 'depressão', 'burnout', 'TDAH', 'enxaqueca', 'pânico'],
    'Psiquiatra',
    'carol.lopes411@hotmail.com',
    'consulta-cbd',
    1,
    false, false
  ),
  (
    'Dra. Lilian',
    '000000', 'SP',
    ARRAY['dor crônica', 'fibromialgia', 'epilepsia', 'autismo', 'geriatria', 'pediatria'],
    'Médica com experiência em dor crônica, neurologia e atendimento de pacientes pediátricos e geriátricos.',
    'lilian@cbdcomreceita.com.br',
    'consulta-lilian',
    2,
    true, true
  ),
  (
    'Dr. Magno',
    '000000', 'SP',
    ARRAY['alcoolismo', 'tabagismo', 'obesidade', 'Parkinson'],
    'Médico especializado em dependência química, controle de peso e doenças neurodegenerativas.',
    'magno@cbdcomreceita.com.br',
    'consulta-magno',
    3,
    false, false
  );

-- ============================================================
-- SEED: Sintomas
-- ============================================================

-- Emergências (aviso, não bloqueia agendamento)
insert into symptoms (slug, label, category, is_emergency, emergency_message, display_order) values
  ('ideacao-suicida', 'Pensamentos de autoagressão ou suicídio', 'emergency', true,
   'Sua segurança é prioridade. Recomendamos buscar apoio imediato: CVV (ligue 188, 24h, gratuito) ou SAMU (192). Você ainda pode seguir com o agendamento, mas considere buscar atendimento emergencial.',
   999),
  ('psicose-ativa', 'Surto psicótico ou alucinações', 'emergency', true,
   'Esse quadro precisa de atendimento médico imediato. Ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo.',
   999),
  ('crise-convulsiva', 'Crise convulsiva frequente ou em curso', 'emergency', true,
   'Crises convulsivas ativas exigem atendimento emergencial. Ligue 192 (SAMU).',
   999);

-- Sintomas regulares (Dra. Carolina Lopes)
insert into symptoms (slug, label, category, display_order) values
  ('ansiedade', 'Ansiedade', 'mental_health', 1),
  ('insonia', 'Insônia', 'sleep', 2),
  ('estresse', 'Estresse', 'mental_health', 3),
  ('mente-acelerada', 'Mente acelerada', 'mental_health', 4),
  ('burnout', 'Burnout', 'mental_health', 5),
  ('depressao', 'Depressão', 'mental_health', 6),
  ('enxaqueca', 'Enxaqueca', 'pain', 7),
  ('tremor-essencial', 'Tremor essencial', 'neuro', 8),
  ('panico', 'Síndrome do pânico', 'mental_health', 9),
  ('tdah', 'TDAH', 'mental_health', 10),
  ('perda-de-peso', 'Perda de peso', 'metabolic', 11);

-- Sintomas regulares (Dra. Lilian)
insert into symptoms (slug, label, category, display_order) values
  ('dores-corpo', 'Dores no corpo', 'pain', 12),
  ('fibromialgia', 'Fibromialgia', 'pain', 13),
  ('epilepsia', 'Epilepsia', 'neuro', 14),
  ('autismo', 'Autismo', 'neuro', 15);

-- Sintomas regulares (Dr. Magno)
insert into symptoms (slug, label, category, display_order) values
  ('alcoolismo', 'Alcoolismo', 'addiction', 16),
  ('obesidade', 'Obesidade', 'metabolic', 17),
  ('tabagismo', 'Tabagismo', 'addiction', 18),
  ('parkinson', 'Parkinson', 'neuro', 19);

-- ============================================================
-- SEED: Mapeamento sintoma → médico
-- ============================================================

-- Dra. Carolina Lopes (priority 1 pra seus sintomas)
insert into symptom_doctor_map (symptom_id, doctor_id, priority)
select s.id, d.id, 1
from symptoms s, doctors d
where d.name = 'Dra. Carolina Lopes'
  and s.slug in ('ansiedade', 'insonia', 'estresse', 'mente-acelerada', 'burnout',
                 'depressao', 'enxaqueca', 'tremor-essencial', 'panico', 'tdah', 'perda-de-peso');

-- Dra. Lilian (priority 1 pra seus sintomas)
insert into symptom_doctor_map (symptom_id, doctor_id, priority)
select s.id, d.id, 1
from symptoms s, doctors d
where d.name = 'Dra. Lilian'
  and s.slug in ('dores-corpo', 'fibromialgia', 'epilepsia', 'autismo');

-- Dr. Magno (priority 1 pra seus sintomas)
insert into symptom_doctor_map (symptom_id, doctor_id, priority)
select s.id, d.id, 1
from symptoms s, doctors d
where d.name = 'Dr. Magno'
  and s.slug in ('alcoolismo', 'obesidade', 'tabagismo', 'parkinson');

-- ============================================================
-- FIM DA MIGRATION 0001
-- ============================================================
