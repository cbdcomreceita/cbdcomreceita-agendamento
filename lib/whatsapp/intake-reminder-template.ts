import { firstName } from "./template";
import { getIntakeReminderTemplateName } from "./config";

export interface IntakeReminderTemplateInput {
  patientFullName: string;
  doctorName: string;
  dateLabel: string; // "09/11, segunda-feira" — see formatDateDDMMWeekday
  timeH: string; // "14h30"
  intakeToken: string;
}

/**
 * `lembrete_prontuario_12h` was never submitted (Parte 0 do relatório: sem
 * o texto aprovado, não registrei nada na Meta). This body layout
 * (nome, médico, data, hora + 1 botão de URL com o token do prontuário)
 * segue o mesmo padrão já aprovado para pix_pendente2 — confirme contra o
 * texto real antes de ligar WHATSAPP_INTAKE_REMINDER_ENABLED, ou o envio
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
      },
      buttons: [{ type: "url" as const, parameter: input.intakeToken }],
    },
  };
}

/** What the NexTalk team sees in their dashboard — never sent to WhatsApp. */
export function buildIntakeReminderContent(input: IntakeReminderTemplateInput): string {
  const name = firstName(input.patientFullName);
  return `Olá, ${name}! Passando para lembrar que sua consulta com ${input.doctorName}, em ${input.dateLabel} às ${input.timeH} (horário de Brasília), ainda precisa de alguns dados seus (RG e endereço) para abrirmos seu prontuário.

Preencha pelo link em anexo. Leva menos de 2 minutos.`;
}
