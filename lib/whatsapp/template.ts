import { NEXTALK_TEMPLATE_NAME } from "./config";

export interface TemplateInput {
  patientFullName: string;
  dateBR: string; // "12/09/2026"
  timeH: string; // "14h30"
  doctorName: string; // "Dra. Thiany Lange" — already includes the honorific
  meetLink: string; // full https://meet.google.com/xxx-xxxx-xxx
  meetCode: string; // just "xxx-xxxx-xxx"
}

/** First name only, for the template's {{1}} — matches the tone of the approved copy. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function buildTemplateParams(input: TemplateInput) {
  return {
    name: NEXTALK_TEMPLATE_NAME,
    category: "UTILITY" as const,
    language: "pt_BR" as const,
    processed_params: {
      body: {
        "1": firstName(input.patientFullName),
        "2": input.dateBR,
        "3": input.timeH,
        "4": input.doctorName,
        "5": input.meetLink,
      },
      buttons: [{ type: "url" as const, parameter: input.meetCode }],
    },
  };
}

/**
 * The `content` field is what the NexTalk TEAM sees in their dashboard —
 * it is never sent to WhatsApp (the actual patient-facing text is the
 * approved template + processed_params). Render it fully so the team's
 * conversation history reads naturally.
 */
export function buildContent(input: TemplateInput): string {
  const name = firstName(input.patientFullName);
  return `Olá, ${name}! Sua consulta está confirmada para ${input.dateBR}, às ${input.timeH} (horário de Brasília), com ${input.doctorName}.

Entre pelo botão "Entrar na consulta", no final desta mensagem, com pelo menos 1 minuto de antecedência para aguardar a abertura do atendimento. Se preferir acessar de outro dispositivo, o link é: ${input.meetLink}

Em respeito ao seu tempo e ao dos demais pacientes, prezamos pela pontualidade. Atrasos de mais de 10 minutos e ausências não avisadas com pelo menos 24 horas de antecedência não terão reembolso: a consulta será considerada perdida e será necessário agendar uma nova sessão.

Tenha em mãos seu peso e sua altura, caso haja prescrição médica.

Desejamos uma ótima consulta!`;
}
