import { medicos, type Medico } from "@/data/medicos";
import { sintomas, type Sintoma } from "@/data/sintomas";
import { sintomasMedicoMap } from "@/data/sintoma-medico-map";

export interface MatchResult {
  doctor: Medico;
  matchedSymptoms: Sintoma[];
  alternativeDoctor?: Medico;
}

/**
 * Match selected symptom slugs to the best doctor.
 *
 * Rules (from PROJECT.md §8):
 * 1. If age < 18 or > 65 → médico que cobre menores/idosos (handles_minors / handles_elderly)
 * 2. For each symptom, find the primary doctor (priority=1 in map)
 * 3. If all symptoms point to the same doctor → that doctor
 * 4. If different doctors → highest global priority wins (Carol=1 > Magno=2)
 * 5. Return matched doctor + alternative (next best)
 */
export interface MatchOptions {
  age?: number;
  isMinor?: boolean;
  isElderly?: boolean;
}

const activeMedicos = medicos.filter((d) => d.isActive);

export function matchDoctor(
  selectedSlugs: string[],
  options: MatchOptions = {}
): MatchResult {
  const { age, isMinor, isElderly } = options;

  // Rule 1: age/flag override → primeiro médico ativo que aceita menores/idosos
  const isUnder18 = isMinor || (age !== undefined && age < 18);
  const isOver65 = isElderly || (age !== undefined && age > 65);

  if (isUnder18 || isOver65) {
    const ageDoctor = activeMedicos
      .filter((d) => (isUnder18 ? d.handlesMinors : d.handlesElderly))
      .sort((a, b) => a.globalPriority - b.globalPriority)[0];

    if (ageDoctor) {
      const matched = sintomas.filter((s) => selectedSlugs.includes(s.slug));
      const altDoctor = findDoctorBySymptoms(selectedSlugs).filter(
        (d) => d.id !== ageDoctor.id
      )[0];
      return {
        doctor: ageDoctor,
        matchedSymptoms: matched,
        alternativeDoctor: altDoctor,
      };
    }
  }

  // Sort doctors by: most symptom matches, then global priority (lower = better)
  const rankedDoctors = findDoctorBySymptoms(selectedSlugs);

  const fallback =
    activeMedicos.find((d) => d.id === "carol") ?? activeMedicos[0];
  const bestDoctor = rankedDoctors[0] ?? fallback;
  const altDoctor = rankedDoctors[1];

  const matchedSymptoms = sintomas.filter((s) => selectedSlugs.includes(s.slug));

  return {
    doctor: bestDoctor,
    matchedSymptoms,
    alternativeDoctor: altDoctor,
  };
}

function findDoctorBySymptoms(selectedSlugs: string[]): Medico[] {
  const doctorScores = new Map<string, number>();

  for (const slug of selectedSlugs) {
    const entries = sintomasMedicoMap.filter(
      (e) => e.sintomaSlug === slug && e.priority === 1
    );
    for (const entry of entries) {
      doctorScores.set(entry.medicoId, (doctorScores.get(entry.medicoId) ?? 0) + 1);
    }
  }

  return activeMedicos
    .filter((d) => doctorScores.has(d.id))
    .sort((a, b) => {
      const scoreA = doctorScores.get(a.id) ?? 0;
      const scoreB = doctorScores.get(b.id) ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.globalPriority - b.globalPriority;
    });
}
