import { firstName } from "./template";
import { getConfirmationV2TemplateName } from "./config";

export interface ConfirmationV2TemplateInput {
  patientFullName: string;
  weekdayDateShort: string; // "quarta-feira, 05/11"
  timeH: string; // "19h30"
  doctorName: string;
  intakeDeadline: string; // "05/11 às 17h30"
  meetLink: string; // full https://meet.google.com/xxx-xxxx-xxx
  intakeToken: string; // raw token — button 1's parameter
  meetCode: string; // just "xxx-xxxx-xxx" — button 2's parameter
}

/**
 * confirmacao_consulta_v2 — only for bookings where intake_required=true.
 * Created on Meta, in review as of 2026-11-06. Body: 6 vars. Buttons, in
 * this exact order: 1) prefix https://www.cbdcomreceita.com.br/prontuario/
 * + intake_token, 2) prefix https://meet.google.com/ + meet code.
 */
export function buildConfirmationV2TemplateParams(input: ConfirmationV2TemplateInput) {
  return {
    name: getConfirmationV2TemplateName(),
    category: "UTILITY" as const,
    language: "pt_BR" as const,
    processed_params: {
      body: {
        "1": firstName(input.patientFullName),
        "2": input.weekdayDateShort,
        "3": input.timeH,
        "4": input.doctorName,
        "5": input.intakeDeadline,
        "6": input.meetLink,
      },
      buttons: [
        { type: "url" as const, parameter: input.intakeToken },
        { type: "url" as const, parameter: input.meetCode },
      ],
    },
  };
}

/** What the NexTalk team sees in their dashboard — never sent to WhatsApp. */
export function buildConfirmationV2Content(input: ConfirmationV2TemplateInput): string {
  const name = firstName(input.patientFullName);
  return `Olá, ${name}! Sua consulta está confirmada para ${input.weekdayDateShort}, às ${input.timeH} (horário de Brasília), com ${input.doctorName}.

Para abrirmos o prontuário, preencha os dados do paciente até ${input.intakeDeadline}. O link do Meet é: ${input.meetLink}`;
}
