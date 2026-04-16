export interface Sintoma {
  slug: string;
  label: string;
  category: string;
  isEmergency: boolean;
  emergencyMessage?: string;
  displayOrder: number;
}

export const sintomas: Sintoma[] = [
  // Emergências
  {
    slug: "ideacao-suicida",
    label: "Pensamentos de autoagressão ou suicídio",
    category: "emergency",
    isEmergency: true,
    emergencyMessage:
      "Sua segurança é prioridade. Recomendamos buscar apoio imediato: CVV (ligue 188, 24h, gratuito) ou SAMU (192). Você ainda pode seguir com o agendamento, mas considere buscar atendimento emergencial.",
    displayOrder: 999,
  },
  {
    slug: "psicose-ativa",
    label: "Surto psicótico ou alucinações",
    category: "emergency",
    isEmergency: true,
    emergencyMessage:
      "Esse quadro precisa de atendimento médico imediato. Ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo.",
    displayOrder: 999,
  },
  {
    slug: "crise-convulsiva",
    label: "Crise convulsiva frequente ou em curso",
    category: "emergency",
    isEmergency: true,
    emergencyMessage:
      "Crises convulsivas ativas exigem atendimento emergencial. Ligue 192 (SAMU).",
    displayOrder: 999,
  },
  // Regulares
  { slug: "ansiedade", label: "Ansiedade", category: "mental_health", isEmergency: false, displayOrder: 1 },
  { slug: "insonia", label: "Insônia", category: "sleep", isEmergency: false, displayOrder: 2 },
  { slug: "estresse", label: "Estresse", category: "mental_health", isEmergency: false, displayOrder: 3 },
  { slug: "mente-acelerada", label: "Mente acelerada", category: "mental_health", isEmergency: false, displayOrder: 4 },
  { slug: "burnout", label: "Burnout", category: "mental_health", isEmergency: false, displayOrder: 5 },
  { slug: "depressao", label: "Depressão", category: "mental_health", isEmergency: false, displayOrder: 6 },
  { slug: "enxaqueca", label: "Enxaqueca", category: "pain", isEmergency: false, displayOrder: 7 },
  { slug: "tremor-essencial", label: "Tremor essencial", category: "neuro", isEmergency: false, displayOrder: 8 },
  { slug: "panico", label: "Síndrome do pânico", category: "mental_health", isEmergency: false, displayOrder: 9 },
  { slug: "tdah", label: "TDAH", category: "mental_health", isEmergency: false, displayOrder: 10 },
  { slug: "perda-de-peso", label: "Perda de peso", category: "metabolic", isEmergency: false, displayOrder: 11 },
  { slug: "dores-corpo", label: "Dores no corpo", category: "pain", isEmergency: false, displayOrder: 12 },
  { slug: "fibromialgia", label: "Fibromialgia", category: "pain", isEmergency: false, displayOrder: 13 },
  { slug: "epilepsia", label: "Epilepsia", category: "neuro", isEmergency: false, displayOrder: 14 },
  { slug: "autismo", label: "Autismo", category: "neuro", isEmergency: false, displayOrder: 15 },
  { slug: "alcoolismo", label: "Alcoolismo", category: "addiction", isEmergency: false, displayOrder: 16 },
  { slug: "obesidade", label: "Obesidade", category: "metabolic", isEmergency: false, displayOrder: 17 },
  { slug: "tabagismo", label: "Tabagismo", category: "addiction", isEmergency: false, displayOrder: 18 },
  { slug: "parkinson", label: "Parkinson", category: "neuro", isEmergency: false, displayOrder: 19 },
];

/** Condições exibidas na landing page (agrupadas pra display) */
export const condicoesLanding = [
  { label: "Ansiedade e estresse persistente", icon: "Brain" as const },
  { label: "Distúrbios do sono", icon: "Moon" as const },
  { label: "Dores crônicas", icon: "Activity" as const },
  { label: "Regulação emocional", icon: "Heart" as const },
  { label: "Condições neurológicas específicas", icon: "Zap" as const },
  { label: "Dependência química", icon: "Shield" as const },
  { label: "Burnout e sobrecarga mental", icon: "Flame" as const },
];
