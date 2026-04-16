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
 * 1. If age < 18 or > 65 → Lilian (handles_minors / handles_elderly)
 *    — age param is optional; will be activated in Bloco 5
 * 2. For each symptom, find the primary doctor (priority=1 in map)
 * 3. If all symptoms point to the same doctor → that doctor
 * 4. If different doctors → highest global priority wins
 *    (Carol=1 > Lilian=2 > Magno=3)
 * 5. Return matched doctor + alternative (next best)
 */
export function matchDoctor(
  selectedSlugs: string[],
  age?: number
): MatchResult {
  // Rule 1: age override
  if (age !== undefined && (age < 18 || age > 65)) {
    const lilian = medicos.find((d) => d.id === "lilian")!;
    const matched = sintomas.filter((s) => selectedSlugs.includes(s.slug));
    const altDoctor = findDoctorBySymptoms(selectedSlugs).filter(
      (d) => d.id !== "lilian"
    )[0];
    return {
      doctor: lilian,
      matchedSymptoms: matched,
      alternativeDoctor: altDoctor,
    };
  }

  // Collect doctors for each symptom
  const doctorScores = new Map<string, number>();

  for (const slug of selectedSlugs) {
    const entries = sintomasMedicoMap.filter((e) => e.sintomaSlug === slug);
    for (const entry of entries) {
      doctorScores.set(entry.medicoId, (doctorScores.get(entry.medicoId) ?? 0) + 1);
    }
  }

  // Sort doctors by: most symptom matches, then global priority (lower = better)
  const rankedDoctors = findDoctorBySymptoms(selectedSlugs);

  const bestDoctor = rankedDoctors[0] ?? medicos.find((d) => d.id === "carol")!;
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

  return medicos
    .filter((d) => doctorScores.has(d.id))
    .sort((a, b) => {
      const scoreA = doctorScores.get(a.id) ?? 0;
      const scoreB = doctorScores.get(b.id) ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.globalPriority - b.globalPriority;
    });
}
