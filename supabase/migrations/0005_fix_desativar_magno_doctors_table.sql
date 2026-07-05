-- Migration 0004 usou nomes errados de tabela (medicos/medico_id em vez de doctors/doctor_id).
-- Esta migration corrige isso operando nas tabelas corretas do schema.

-- 1. Desativar Dr. Magno na tabela correta
UPDATE doctors SET is_active = false WHERE name = 'Dr. Magno Cruz';

-- 2. Dra. Carol passa a atender menores e idosos
UPDATE doctors SET handles_minors = true, handles_elderly = true WHERE name = 'Dra. Carolina Lopes';

-- 3. Redirecionar symptom_doctor_map: substituir entradas do Magno pela Carol
INSERT INTO symptom_doctor_map (symptom_id, doctor_id, priority)
SELECT sdm.symptom_id, carol.id, sdm.priority
FROM symptom_doctor_map sdm
JOIN doctors magno ON magno.id = sdm.doctor_id AND magno.name = 'Dr. Magno Cruz'
CROSS JOIN (SELECT id FROM doctors WHERE name = 'Dra. Carolina Lopes') carol
ON CONFLICT (symptom_id, doctor_id) DO NOTHING;

-- Remover entradas antigas do Magno
DELETE FROM symptom_doctor_map
WHERE doctor_id = (SELECT id FROM doctors WHERE name = 'Dr. Magno Cruz');
