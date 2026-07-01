-- Dra. Carol assume todos os sintomas do Dr. Magno; Dr. Magno desativado.

-- 1. Desativar Dr. Magno
UPDATE medicos SET is_active = false WHERE id = 'magno';

-- 2. Dra. Carol passa a atender menores e idosos
UPDATE medicos SET handles_minors = true, handles_elderly = true WHERE id = 'carol';

-- 3. Redirecionar sintomas do Magno para Carol
UPDATE symptom_doctor_map SET medico_id = 'carol' WHERE medico_id = 'magno';

-- 4. Adicionar especialidades do Magno à Carol (se não existirem)
INSERT INTO medico_specialties (medico_id, specialty)
SELECT 'carol', unnest(ARRAY[
  'Dores no corpo', 'Fibromialgia', 'Epilepsia', 'Autismo',
  'Alcoolismo', 'Obesidade', 'Tabagismo', 'Parkinson'
])
ON CONFLICT (medico_id, specialty) DO NOTHING;
