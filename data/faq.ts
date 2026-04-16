export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Qual o valor do atendimento médico?",
    answer:
      "A consulta de avaliação inicial custa R\u00A049,90. O atendimento é realizado online, por videochamada, com médico prescritor.",
  },
  {
    question: "A consulta garante a emissão de receita?",
    answer:
      "A prescrição depende da avaliação médica individualizada. O médico só prescreve quando há indicação clínica.",
  },
  {
    question: "Existe custo para a consultoria de importação?",
    answer:
      "A consultoria de importação e acompanhamento regulatório é um serviço à parte, com valores apresentados após a consulta quando aplicável.",
  },
  {
    question: "De onde vêm os medicamentos?",
    answer:
      "Os produtos são importados de fabricantes internacionais autorizados, seguindo os critérios regulatórios da Anvisa.",
  },
  {
    question: "O atendimento é online?",
    answer:
      "Sim. A consulta é realizada por videochamada via Google Meet, de qualquer lugar do Brasil.",
  },
  {
    question: "Já tenho prescrição. Posso seguir direto?",
    answer:
      "Sim. Entre em contato pelo nosso WhatsApp que orientamos os próximos passos para quem já possui receita médica.",
  },
  {
    question: "O que é CBD?",
    answer:
      "O canabidiol (CBD) é um dos compostos da planta Cannabis, utilizado em tratamentos médicos para diversas condições como ansiedade, dor crônica e distúrbios do sono. Seu uso medicinal é regulamentado pela Anvisa no Brasil.",
  },
  {
    question: "É legal no Brasil?",
    answer:
      "Sim. Desde 2015 a Anvisa autoriza o uso medicinal do CBD, mediante prescrição médica e autorização de importação.",
  },
  {
    question: "E se eu não comparecer à consulta?",
    answer:
      "Caso não compareça ou atrase mais de 10 minutos, será necessário um novo agendamento com pagamento.",
  },
  {
    question: "Como meus dados são protegidos?",
    answer:
      "Seguimos a Lei Geral de Proteção de Dados (LGPD). Seus dados são criptografados e utilizados exclusivamente para fins do tratamento médico.",
  },
];
