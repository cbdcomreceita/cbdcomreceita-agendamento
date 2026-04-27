-- ============================================================
-- Migration 0002: Reorganização dos médicos
--
-- Mudanças:
-- 1. Dra. Lilian → desativada (is_active = false). Sintomas e regra
--    de idade transferidos para Dr. Magno.
-- 2. Dr. Magno → atualizado com dados completos (CRM 28892/SC,
--    drmagnocruz@gmail.com), assume sintomas da Lilian e regra de idade
--    (handles_minors/handles_elderly), promovido a global_priority = 2.
-- 3. Dra. Carolina Lopes → especialidade ajustada para "Psiquiatria".
--
-- Idempotente: usa UPDATEs por nome e regenera o mapeamento de
-- sintomas relacionados.
-- ============================================================

-- 1) Dra. Carolina Lopes — especialidade "Psiquiatria"
update doctors
   set bio_short = 'Psiquiatria'
 where name = 'Dra. Carolina Lopes';

-- 2) Dra. Lilian — desativar
update doctors
   set is_active = false
 where name = 'Dra. Lilian';

-- 3) Dr. Magno — completar cadastro e promover a priority 2
update doctors
   set name = 'Dr. Magno Cruz',
       crm = '28892',
       crm_uf = 'SC',
       email = 'drmagnocruz@gmail.com',
       bio_short = 'Clínico Geral',
       calcom_event_type_slug = 'consulta-dr-magno-cruz',
       global_priority = 2,
       handles_minors = true,
       handles_elderly = true,
       is_active = true
 where name in ('Dr. Magno', 'Dr. Magno Cruz');

-- 4) Remapeamento sintoma → médico
--    Remover entradas da Lilian (que está desativada) e da Magno
--    (caso já existam) para os sintomas envolvidos, e re-inserir
--    apontando todos pra Magno com priority 1.
delete from symptom_doctor_map
 where (doctor_id in (select id from doctors where name = 'Dra. Lilian'))
    or (
      doctor_id in (select id from doctors where name = 'Dr. Magno Cruz')
      and symptom_id in (
        select id from symptoms
         where slug in (
           'dores-corpo', 'fibromialgia', 'epilepsia', 'autismo',
           'alcoolismo', 'obesidade', 'tabagismo', 'parkinson'
         )
      )
    );

insert into symptom_doctor_map (symptom_id, doctor_id, priority)
select s.id, d.id, 1
  from symptoms s, doctors d
 where d.name = 'Dr. Magno Cruz'
   and s.slug in (
     'dores-corpo', 'fibromialgia', 'epilepsia', 'autismo',
     'alcoolismo', 'obesidade', 'tabagismo', 'parkinson'
   );

-- ============================================================
-- FIM DA MIGRATION 0002
-- ============================================================
