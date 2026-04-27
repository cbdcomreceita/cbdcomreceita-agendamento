export interface Medico {
  id: string;
  name: string;
  email: string;
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
  calcomEventTypeId: number | null;
  specialties: string[];
  isActive: boolean;
}

export const medicos: Medico[] = [
  {
    id: "carol",
    name: "Dra. Carolina Lopes",
    email: "carol.lopes411@hotmail.com",
    crm: "215691",
    crmUf: "SP",
    specialty: "Psiquiatria",
    bioShort: "Psiquiatra com foco em saúde mental e qualidade de vida.",
    photoUrl: "/images/dra-carolina-lopes.jpg",
    initials: "CL",
    globalPriority: 1,
    handlesMinors: false,
    handlesElderly: false,
    calcomSlug: "consulta",
    calcomEventTypeId: 5362820,
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
    isActive: true,
  },
  {
    id: "lilian",
    name: "Dra. Lilian",
    email: "lilian@cbdcomreceita.com.br",
    crm: "",
    crmUf: "",
    specialty: "Dor crônica e neurologia",
    bioShort:
      "Médica com experiência em dor crônica, neurologia e atendimento de pacientes pediátricos e geriátricos.",
    photoUrl: null,
    initials: "DL",
    globalPriority: 99,
    handlesMinors: true,
    handlesElderly: true,
    calcomSlug: "consulta-lilian",
    calcomEventTypeId: null,
    specialties: [
      "Dor crônica",
      "Fibromialgia",
      "Epilepsia",
      "Autismo",
    ],
    isActive: false,
  },
  {
    id: "magno",
    name: "Dr. Magno Cruz",
    email: "drmagnocruz@gmail.com",
    crm: "28892",
    crmUf: "SC",
    specialty: "Clínico Geral",
    bioShort:
      "Clínico Geral com atuação em dependência química, dor crônica, neurologia e atendimento de pacientes pediátricos e geriátricos.",
    photoUrl: "/images/dr-magno-cruz.jpg",
    initials: "MC",
    globalPriority: 2,
    handlesMinors: true,
    handlesElderly: true,
    calcomSlug: "consulta-dr-magno-cruz",
    calcomEventTypeId: 5508269,
    specialties: [
      "Dores no corpo",
      "Fibromialgia",
      "Epilepsia",
      "Autismo",
      "Alcoolismo",
      "Obesidade",
      "Tabagismo",
      "Parkinson",
    ],
    isActive: true,
  },
];
