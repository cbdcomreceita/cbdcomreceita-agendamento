/** Mapping: symptom slug → doctor id with priority */
export interface SintomaMedicoEntry {
  sintomaSlug: string;
  medicoId: string;
  priority: number;
}

export const sintomasMedicoMap: SintomaMedicoEntry[] = [
  // Dra. Carolina Lopes (carol) — priority 1
  { sintomaSlug: "ansiedade", medicoId: "carol", priority: 1 },
  { sintomaSlug: "insonia", medicoId: "carol", priority: 1 },
  { sintomaSlug: "estresse", medicoId: "carol", priority: 1 },
  { sintomaSlug: "mente-acelerada", medicoId: "carol", priority: 1 },
  { sintomaSlug: "burnout", medicoId: "carol", priority: 1 },
  { sintomaSlug: "depressao", medicoId: "carol", priority: 1 },
  { sintomaSlug: "enxaqueca", medicoId: "carol", priority: 1 },
  { sintomaSlug: "tremor-essencial", medicoId: "carol", priority: 1 },
  { sintomaSlug: "panico", medicoId: "carol", priority: 1 },
  { sintomaSlug: "tdah", medicoId: "carol", priority: 1 },
  { sintomaSlug: "perda-de-peso", medicoId: "carol", priority: 1 },

  // Dra. Lilian (lilian) — priority 1
  { sintomaSlug: "dores-corpo", medicoId: "lilian", priority: 1 },
  { sintomaSlug: "fibromialgia", medicoId: "lilian", priority: 1 },
  { sintomaSlug: "epilepsia", medicoId: "lilian", priority: 1 },
  { sintomaSlug: "autismo", medicoId: "lilian", priority: 1 },

  // Dr. Magno (magno) — priority 1
  { sintomaSlug: "alcoolismo", medicoId: "magno", priority: 1 },
  { sintomaSlug: "obesidade", medicoId: "magno", priority: 1 },
  { sintomaSlug: "tabagismo", medicoId: "magno", priority: 1 },
  { sintomaSlug: "parkinson", medicoId: "magno", priority: 1 },
];
