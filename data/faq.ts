export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Qual o valor do atendimento médico?",
    answer:
      "A avaliação médica inicial tem valor de R$\u00A049,90 e é realizada por profissional habilitado, mediante análise individualizada do caso.",
  },
  {
    question: "A consulta garante a emissão de receita?",
    answer:
      "Não. A prescrição depende exclusivamente da avaliação clínica do médico. A indicação do tratamento ocorre apenas quando houver critério técnico e respaldo médico adequado.",
  },
  {
    question: "Existe custo para a consultoria de importação?",
    answer:
      "Não. A consultoria de orientação para acesso ao tratamento é gratuita. Nossa equipe auxilia o paciente na organização do processo via plataforma da Anvisa e no direcionamento a fornecedores internacionais quando houver prescrição médica.",
  },
  {
    question: "De onde vêm os medicamentos?",
    answer:
      "Os produtos são importados de fornecedores internacionais que seguem critérios técnicos e regulatórios compatíveis com as exigências aplicáveis no Brasil. A CBD com Receita organiza e conduz toda a conexão entre paciente, prescrição médica e fornecedor, oferecendo suporte ao longo do processo regulatório via plataforma da Anvisa. A aquisição do produto ocorre diretamente entre paciente e fornecedor internacional autorizado.",
  },
  {
    question: "O atendimento é online?",
    answer:
      "Sim. Todo o processo é realizado de forma online, desde a avaliação médica até a organização regulatória necessária para acesso ao tratamento. Após a prescrição, a condução da importação é realizada com suporte estruturado, e o produto é entregue diretamente no domicílio do paciente.",
  },
  {
    question: "Já tenho prescrição. Posso seguir direto?",
    answer:
      "Sim. Se você já possui prescrição válida, nossa equipe orienta sobre as etapas seguintes para condução do tratamento.",
  },
];
