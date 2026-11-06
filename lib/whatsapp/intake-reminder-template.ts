import { firstName } from "./template";
import { getIntakeReminderTemplateName } from "./config";

export interface IntakeReminderTemplateInput {
  patientFullName: string;
  doctorName: string;
  dateLabel: string; // "hoje" ou "amanhã, dd/MM" — see formatTodayTomorrowLabel
  timeH: string; // "14h30"
  intakeDeadline: string; // "05/11 às 17h30" — see formatIntakeDeadline
  intakeToken: string;
}

/**
 * `lembrete_prontuario_12h`, criado na Meta e em análise (Parte 0/item 2 do
 * relatório). Corpo: nome, médico, "hoje"/"amanhã, dd/MM", hora, prazo do
 * prontuário. Botão de URL único com o token do prontuário. Confirme contra
 * o texto real antes de ligar WHATSAPP_INTAKE_REMINDER_ENABLED, ou o envio
 * falha com "number of params does not match" (mesma armadilha documentada
 * em docs/nextalk-api-lembrete.pdf).
 */
export function buildIntakeReminderTemplateParams(input: IntakeReminderTemplateInput) {
  return {
    name: getIntakeReminderTemplateName(),
    category: "UTILITY" as const,
    language: "pt_BR" as const,
    processed_params: {
      body: {
        "1": firstName(input.patientFullName),
        "2": input.doctorName,
        "3": input.dateLabel,
        "4": input.timeH,
        "5": input.intakeDeadline,
      },
      buttons: [{ type: "url" as const, parameter: input.intakeToken }],
    },
  };
}

/** What the NexTalk team sees in their dashboard — never sent to WhatsApp. */
export function buildIntakeReminderContent(input: IntakeReminderTemplateInput): string {
  const name = firstName(input.patientFullName);
  return `Olá, ${name}! Passando para lembrar que sua consulta com ${input.doctorName}, ${input.dateLabel} às ${input.timeH} (horário de Brasília), ainda precisa dos dados do paciente para abrirmos o prontuário. Prazo: ${input.intakeDeadline}.

Preencha pelo link em anexo. Leva menos de 2 minutos.`;
}
