import { medicos, type Medico } from "@/data/medicos";
import { sintomas, type Sintoma } from "@/data/sintomas";

export interface MatchResult {
  doctor: Medico;
  matchedSymptoms: Sintoma[];
  alternativeDoctor?: Medico;
}

export interface MatchOptions {
  age?: number;
  isMinor?: boolean;
  isElderly?: boolean;
}

const activeMedicos = medicos.filter((d) => d.isActive);

// Returns Carol as the primary doctor (fallback for resultado page)
export function matchDoctor(
  selectedSlugs: string[],
  options: MatchOptions = {}
): MatchResult {
  const { age, isMinor, isElderly } = options;

  const isUnder18 = isMinor || (age !== undefined && age < 18);
  const isOver65 = isElderly || (age !== undefined && age > 65);

  const carol = activeMedicos.find((d) => d.id === "carol") ?? activeMedicos[0];
  const matchedSymptoms = sintomas.filter((s) => selectedSlugs.includes(s.slug));

  if (isUnder18 || isOver65) {
    const ageDoctor = activeMedicos
      .filter((d) => (isUnder18 ? d.handlesMinors : d.handlesElderly))
      .sort((a, b) => a.globalPriority - b.globalPriority)[0] ?? carol;
    return { doctor: ageDoctor, matchedSymptoms };
  }

  return { doctor: carol, matchedSymptoms };
}
