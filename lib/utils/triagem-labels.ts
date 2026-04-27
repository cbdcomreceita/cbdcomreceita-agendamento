import { sintomas } from "@/data/sintomas";

export const DURATION_LABELS: Record<string, string> = {
  less_1m: "Menos de 1 mês",
  "1_6m": "Entre 1 e 6 meses",
  "6_12m": "Entre 6 meses e 1 ano",
  more_1y: "Mais de 1 ano",
};

export const PRIOR_CBD_LABELS: Record<string, string> = {
  never: "Nunca usou",
  with_prescription: "Sim, com prescrição",
  self: "Sim, por conta própria",
  prefer_not_say: "Prefere não dizer",
};

export const PRIOR_TREATMENT_LABELS: Record<string, string> = {
  never: "Nunca tratou",
  medication: "Medicamento(s)",
  therapy: "Terapia",
  other: "Outro",
};

export function getSymptomLabels(slugs: string[] | null | undefined): string[] {
  if (!slugs?.length) return [];
  const map = new Map(sintomas.map((s) => [s.slug, s.label]));
  return slugs.map((slug) => map.get(slug) ?? slug);
}
