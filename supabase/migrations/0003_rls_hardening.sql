-- ============================================================
-- Migration 0003: RLS Hardening
-- ============================================================
-- Auditoria revelou tabelas com RLS ativo mas sem policies. Na prática
-- estão protegidas porque o app só acessa via service_role (que bypassa
-- RLS), mas a configuração está incompleta — clientes anon ou
-- authenticated recebem "0 rows" sem erro claro, o que é frágil
-- e ruim pra auditoria LGPD.
--
-- Esta migration adiciona policies de DENY explícito pras tabelas
-- sensíveis. Service role continua bypassando, então o app não muda
-- comportamento. Permissive policies pré-existentes em config, doctors,
-- symptoms e symptom_doctor_map ficam intactas.
--
-- Nota sobre notifications_log: o plano original era dropar essa tabela,
-- mas ela é usada em app/api/cron/lembretes/route.ts pra idempotência
-- de lembretes (evita reenviar 24h/1h). Mantida e protegida com DENY.
-- Refactor pra remover a tabela fica como follow-up separado.
--
-- TODO (Q3 2026): quando implementarmos login de paciente/médico via
-- Supabase Auth, substituir as policies abaixo por policies baseadas em
-- auth.uid() — ex: paciente só vê próprios bookings/payments.
-- ============================================================

-- patients: dados pessoais sensíveis (CPF, RG, endereço completo)
create policy "deny_all_anon_authenticated_patients"
  on public.patients
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- bookings: agendamentos (FK pra patient)
create policy "deny_all_anon_authenticated_bookings"
  on public.bookings
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- payments: dados financeiros (mp_payment_id, valores, status)
create policy "deny_all_anon_authenticated_payments"
  on public.payments
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- audit_events: logs internos (erros, eventos de pagamento, LGPD)
create policy "deny_all_anon_authenticated_audit_events"
  on public.audit_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- notifications_log: histórico de notificações enviadas
create policy "deny_all_anon_authenticated_notifications_log"
  on public.notifications_log
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ============================================================
-- Verificação esperada após apply:
--
-- select tablename, rowsecurity as rls,
--        (select count(*) from pg_policies p
--          where p.schemaname = 'public' and p.tablename = t.tablename) as policies
--   from pg_tables t
--  where schemaname = 'public'
--  order by tablename;
--
-- Esperado: as 5 tabelas acima devem ter pelo menos 1 policy cada,
-- além de config/doctors/symptoms/symptom_doctor_map que já tinham
-- policies de leitura pública.
-- ============================================================

-- ============================================================
-- FIM DA MIGRATION 0003
-- ============================================================
