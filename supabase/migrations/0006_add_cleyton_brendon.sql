-- Add Dr. Cleyton and Dr. Brendon to the doctors table
INSERT INTO doctors (
  name,
  crm,
  crm_uf,
  specialties,
  bio_short,
  photo_url,
  email,
  calcom_event_type_slug,
  calcom_event_type_id,
  global_priority,
  handles_minors,
  handles_elderly,
  is_active
) VALUES
  (
    'Dr. Cleyton Rosário de Souza',
    '9841',
    'RO',
    ARRAY['Clínico Geral'],
    'Clínico Geral com atendimento de pacientes pediátricos e geriátricos.',
    '/images/DrCleyton.jpeg',
    'cleytonmadrid2019@gmail.com',
    'consulta-scheduler-dr-cleyton',
    6217702,
    2,
    true,
    true,
    true
  ),
  (
    'Dr. Brendon Richard Boasquivesqui Miranda Paes',
    '9805',
    'RO',
    ARRAY['Clínico Geral'],
    'Clínico Geral com atendimento de pacientes pediátricos e geriátricos.',
    '/images/DrBrendon.jpeg',
    'brendonrichard827@gmail.com',
    'consulta-scheduler-dr-brendon',
    6217774,
    3,
    true,
    true,
    true
  );
