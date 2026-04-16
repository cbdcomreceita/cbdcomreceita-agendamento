export interface Medico {
  id: string;
  name: string;
  crm: string;
  crmUf: string;
  specialty: string;
  bioShort: string;
  photoUrl: string | null;
  initials: string;
  globalPriority: number;
  handlesMinors: boolean;
  handlesElderly: boolean;
  calcomSlug: string;
  specialties: string[];
}

export const medicos: Medico[] = [
  {
    id: "carol",
    name: "Dra. Carolina Lopes",
    crm: "215691",
    crmUf: "SP",
    specialty: "Psiquiatra",
    bioShort: "Psiquiatra com foco em saúde mental e qualidade de vida.",
    photoUrl: "/images/dra-carolina-lopes.jpg",
    initials: "CL",
    globalPriority: 1,
    handlesMinors: false,
    handlesElderly: false,
    calcomSlug: "consulta-cbd",
    specialties: [
      "Ansiedade",
      "Insônia",
      "Depressão",
      "Burnout",
      "TDAH",
      "Enxaqueca",
      "Pânico",
      "Estresse",
      "Mente acelerada",
      "Tremor essencial",
      "Perda de peso",
    ],
  },
  {
    id: "lilian",
    name: "Dra. Lilian",
    crm: "",
    crmUf: "",
    specialty: "Dor crônica e neurologia",
    bioShort:
      "Médica com experiência em dor crônica, neurologia e atendimento de pacientes pediátricos e geriátricos.",
    photoUrl: null,
    initials: "DL",
    globalPriority: 2,
    handlesMinors: true,
    handlesElderly: true,
    calcomSlug: "consulta-lilian",
    specialties: [
      "Dor crônica",
      "Fibromialgia",
      "Epilepsia",
      "Autismo",
    ],
  },
  {
    id: "magno",
    name: "Dr. Magno",
    crm: "",
    crmUf: "",
    specialty: "Dependência química e neurologia",
    bioShort:
      "Médico especializado em dependência química, controle de peso e doenças neurodegenerativas.",
    photoUrl: null,
    initials: "DM",
    globalPriority: 3,
    handlesMinors: false,
    handlesElderly: false,
    calcomSlug: "consulta-magno",
    specialties: [
      "Alcoolismo",
      "Obesidade",
      "Tabagismo",
      "Parkinson",
    ],
  },
];
