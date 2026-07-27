export type ParaQuem = "mim" | "outra_pessoa";

export type DuvidaId =
  | "legal"
  | "vicia"
  | "barato"
  | "custo"
  | "funciona"
  | "receber"
  | "efeito_colateral"
  | "outro";

export type MicroGroupId =
  | "ansiedade_sono"
  | "dor"
  | "epilepsia"
  | "autismo_tdah"
  | "parkinson";

export const HERO_LINE = "Saiba por onde começar";
export const HERO_BUTTON_LABEL = "Quero saber se faz sentido pro meu caso";

export const TELA1_TITLE = "Vamos entender o seu caso";
export const TELA1_SUBTITLE =
  "Assim a gente te explica o CBD de um jeito específico pro que você está sentindo.";

export const PARA_QUEM_QUESTION = "É pra você ou pra outra pessoa?";
export const PARA_QUEM_OPTIONS: { value: ParaQuem; label: string }[] = [
  { value: "mim", label: "Pra mim" },
  { value: "outra_pessoa", label: "Pra outra pessoa" },
];

export const SINTOMAS_QUESTION = "O que está sentindo?";
export const SINTOMAS_SUBTITLE = "Pode marcar mais de um.";

export interface SintomaChip {
  id: string;
  label: string;
  /** Slugs compatíveis com data/sintomas.ts, usados no carry-over pra /triagem */
  triagemSlugs: string[];
  microGroup: MicroGroupId | null;
}

export const SINTOMA_CHIPS: SintomaChip[] = [
  { id: "ansiedade", label: "ansiedade", triagemSlugs: ["ansiedade"], microGroup: "ansiedade_sono" },
  { id: "insonia", label: "insônia", triagemSlugs: ["insonia"], microGroup: "ansiedade_sono" },
  { id: "estresse-mente-acelerada", label: "estresse ou mente acelerada", triagemSlugs: ["estresse", "mente-acelerada"], microGroup: "ansiedade_sono" },
  { id: "burnout", label: "burnout", triagemSlugs: ["burnout"], microGroup: "ansiedade_sono" },
  { id: "depressao", label: "depressão", triagemSlugs: ["depressao"], microGroup: "ansiedade_sono" },
  { id: "panico", label: "pânico", triagemSlugs: ["panico"], microGroup: "ansiedade_sono" },
  { id: "enxaqueca", label: "enxaqueca", triagemSlugs: ["enxaqueca"], microGroup: "dor" },
  { id: "dores-corpo", label: "dores no corpo", triagemSlugs: ["dores-corpo"], microGroup: "dor" },
  { id: "fibromialgia", label: "fibromialgia", triagemSlugs: ["fibromialgia"], microGroup: "dor" },
  { id: "tdah", label: "TDAH", triagemSlugs: ["tdah"], microGroup: "autismo_tdah" },
  { id: "epilepsia", label: "epilepsia", triagemSlugs: ["epilepsia"], microGroup: "epilepsia" },
  { id: "autismo", label: "autismo", triagemSlugs: ["autismo"], microGroup: "autismo_tdah" },
  { id: "parkinson-tremor", label: "Parkinson ou tremor", triagemSlugs: ["parkinson", "tremor-essencial"], microGroup: "parkinson" },
];

export const CONTINUAR_LABEL = "Continuar";

export const TELA3_TITLE = "Qual dúvida você ainda tem?";
export const TELA3_SUBTITLE = "Pode marcar mais de uma, a gente responde todas.";
export const VER_RESPOSTAS_LABEL = "Ver minhas respostas";
export const OUTRO_PLACEHOLDER = "Conta pra gente sua dúvida";

export const DUVIDA_OPTIONS: { id: DuvidaId; label: string }[] = [
  { id: "legal", label: "Isso é legal?" },
  { id: "vicia", label: "Vicia?" },
  { id: "barato", label: "Dá barato?" },
  { id: "custo", label: "Quanto custa?" },
  { id: "funciona", label: "Funciona pro meu caso?" },
  { id: "receber", label: "Como eu recebo o produto?" },
  { id: "efeito_colateral", label: "Tem efeito colateral?" },
  { id: "outro", label: "Outro" },
];

// Bloco fixo de resultado — escolhido pelo primeiro sintoma marcado com grupo definido
export const CBD_BLOCK_TITLE = "Primeiro, o que é o CBD";

export const MICRO_TEXTS: Record<MicroGroupId, string[]> = {
  ansiedade_sono: [
    "O CBD (canabidiol) é um **princípio ativo extraído da cannabis**, regulamentado pela **Anvisa desde 2019** e vendido no Brasil **com receita médica**.",
    "Ele age no **sistema endocanabinoide**, que é o sistema do seu próprio corpo responsável por regular **sono, humor, ansiedade e dor**.",
    "**Ele não é um sedativo.** A ação dele é de regulação e não de supressão, então **não te apaga** nem deixa aquele efeito rebote no dia seguinte.",
  ],
  dor: [
    "O CBD (canabidiol) é um **princípio ativo extraído da cannabis**, regulamentado pela **Anvisa desde 2019** e vendido no Brasil **com receita médica**.",
    "Na dor que persiste, ele age em **receptores ligados à percepção de dor e à inflamação**.",
    "É um caminho **diferente do anti inflamatório comum**, que atua no local da inflamação. Por isso costuma ser considerado quando a dor continua mesmo com o tratamento convencional.",
  ],
  epilepsia: [
    "O CBD (canabidiol) é um **princípio ativo extraído da cannabis**.",
    "Na epilepsia ele é o **caso mais estudado** da cannabis medicinal, e existe inclusive **produto com registro na Anvisa** para essa indicação.",
    "A dose é sempre individual e depende dos medicamentos que a pessoa já usa, então **o acompanhamento médico aqui não é opcional**.",
  ],
  autismo_tdah: [
    "O CBD (canabidiol) é um **princípio ativo extraído da cannabis**, regulamentado pela **Anvisa desde 2019** e vendido no Brasil **com receita médica**.",
    "Ele age no **sistema endocanabinoide**, que participa da regulação do **sono, do humor e da resposta ao estresse**. O uso nesses casos é sempre individualizado e acompanhado de perto por médico.",
    "**Se você está pesquisando pro seu filho**, saiba que essa é uma das buscas mais comuns que chegam até a gente. **Atendemos crianças e adolescentes**, sempre com o responsável presente na consulta.",
  ],
  parkinson: [
    "O CBD (canabidiol) é um **princípio ativo extraído da cannabis**, regulamentado pela **Anvisa desde 2019** e vendido no Brasil **com receita médica**.",
    "Ele age no **sistema endocanabinoide**, que participa da regulação do **movimento, do sono e da resposta ao estresse**.",
    "A avaliação médica é o que define se faz sentido no seu caso e em qual dose.",
  ],
};

export const FECHO_COMUM =
  "O CBD existe em **concentrações diferentes** e em formatos como **óleo, cápsula, goma e creme**. O que funciona pra uma pessoa não é o que funciona pra outra, e **é isso que o médico define** olhando pro seu histórico e pro que você já toma.";

export const ABERTURA_PARAGRAPHS = [
  "**Com base no que você contou, aqui está o que é importante você saber.**",
];

export const DUVIDA_BLOCKS: Record<DuvidaId, { question: string; paragraphs: string[] }> = {
  legal: {
    question: "Isso é legal?",
    paragraphs: [
      "**Sim.** A Anvisa regulamenta produtos de cannabis medicinal **desde 2019**.",
      "O caminho legal é **receita médica** mais autorização de importação, ou produto já registrado no Brasil.",
      "**Sem receita não existe forma legal de comprar**, e é por isso que a consulta é o primeiro passo.",
    ],
  },
  vicia: {
    question: "Vicia?",
    paragraphs: [
      "**Não.** O que causa dependência na cannabis é o **THC**, que é outra substância.",
      "Os produtos prescritos aqui têm **THC em teor mínimo ou zero**.",
      "A **Organização Mundial da Saúde** avaliou o canabidiol e **não encontrou potencial de abuso ou dependência**.",
    ],
  },
  barato: {
    question: "Dá barato?",
    paragraphs: [
      "**Não.** O efeito de alteração da percepção vem do **THC**, e não do CBD.",
      "Os produtos indicados aqui são de uso terapêutico, com **THC em teor mínimo ou zero**.",
      "Você **não fica alterado**, não perde o dia e pode **dirigir e trabalhar normalmente**, seguindo a orientação do médico.",
    ],
  },
  custo: {
    question: "Quanto custa?",
    paragraphs: [
      "A consulta custa **R$49,90**, um valor possível porque temos **parceria direta com os médicos**, que atendem pela nossa estrutura e pela nossa agenda.",
      "O tratamento em si costuma ficar entre **R$80 e R$200 por mês** na maioria dos casos, dependendo do formato e da concentração que o médico indicar. Casos que exigem mais de um produto podem passar disso.",
      "**Você só compra o produto depois da consulta**, se o médico indicar.",
    ],
  },
  funciona: {
    question: "Funciona pro meu caso?",
    paragraphs: [
      "Essa é a pergunta que **não dá pra responder por aqui** com honestidade, e desconfie de quem responder.",
      "Depende da **sua dose**, do **que você já toma**, do seu histórico e de há quanto tempo você convive com isso.",
      "Quem consegue avaliar tudo isso junto é **um médico, olhando pro seu caso**. É pra isso que existe a consulta.",
    ],
  },
  receber: {
    question: "Como eu recebo o produto?",
    paragraphs: [
      "Depois da consulta, **se houver prescrição**, a gente te acompanha no processo inteiro.",
      "São dois caminhos possíveis: **importação com autorização da Anvisa** ou **produto já registrado com entrega em casa**.",
      "O médico indica qual serve pro seu caso e **a nossa equipe cuida da burocracia** com você.",
    ],
  },
  efeito_colateral: {
    question: "Tem efeito colateral?",
    paragraphs: [
      "Como todo medicamento, **pode ter**. Os mais relatados são **sonolência, boca seca e alteração do apetite**, geralmente ligados à dose.",
      "É por isso que **a dose começa baixa** e vai sendo ajustada com acompanhamento, em vez de já entrar no valor cheio.",
    ],
  },
  outro: {
    question: "Outro",
    paragraphs: [
      "Sua dúvida é específica, e é exatamente pra isso que existe a consulta.",
      "Em **25 minutos por vídeo**, o médico responde olhando pro seu caso. Se preferir tirar a dúvida antes, **nossa equipe está no WhatsApp**.",
    ],
  },
};

export const CONFIANCA_TITLE = "Quem vai te atender";
export const CONFIANCA_PARAGRAPHS = [
  "Médicos com **registro ativo no CRM** e **formação em cannabis medicinal**, de especialidades diferentes.",
  "Você não escolhe no escuro. Pelas suas respostas **a gente já direciona** pro profissional que atende o seu tipo de caso, e **antes de confirmar** você vê o nome, a foto e o CRM do médico.",
];

export const CTA_LABEL = "Quero agendar minha consulta por R$49,90";
export const CTA_SUBTEXT = "Consulta online de **25 minutos**, por vídeo.";
export const CTA_BODY_PARAGRAPHS = [
  "**Você não precisa decidir se o CBD é pra você**, essa avaliação é do médico. Ele olha seu histórico, o que você já toma e o seu caso, e indica o melhor caminho.",
  "Se o CBD fizer sentido, **ele prescreve e a gente te acompanha** em todo o processo. Se não fizer, ele te direciona pro tratamento mais adequado.",
];
export const SECONDARY_LABEL = "Ainda tenho dúvidas";

export const WHATSAPP_NUMBER = "5584997048210";

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEntenderWhatsAppMessage(params: {
  sintomasLabels: string[];
  outroTexto: string;
}): string {
  const lines = ["Oi! Estava no site de vocês e ainda tenho dúvidas sobre o tratamento."];
  if (params.sintomasLabels.length > 0) {
    lines.push(`Meu caso: ${params.sintomasLabels.join(", ")}.`);
  }
  if (params.outroTexto.trim()) {
    lines.push(`Minha dúvida: ${params.outroTexto.trim()}.`);
  }
  return lines.join("\n");
}
