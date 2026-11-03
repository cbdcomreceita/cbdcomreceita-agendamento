import { firstName } from "./template";
import { getPixReminderTemplateName } from "./config";

export interface PixReminderTemplateInput {
  patientFullName: string;
  doctorName: string; // "Dra. Thiany Lange" — already includes the honorific
  dateLabel: string; // "02/11, segunda-feira" — see formatDateDDMMWeekday
  timeH: string; // "14h30"
  expirationTimeH: string; // "16h30" — hora de validade do PIX
  paymentToken: string;
}

export function buildPixReminderTemplateParams(input: PixReminderTemplateInput) {
  return {
    name: getPixReminderTemplateName(),
    category: "UTILITY" as const,
    language: "pt_BR" as const,
    processed_params: {
      body: {
        "1": firstName(input.patientFullName),
        "2": input.doctorName,
        "3": input.dateLabel,
        "4": input.timeH,
        "5": input.expirationTimeH,
      },
      buttons: [{ type: "url" as const, parameter: input.paymentToken }],
    },
  };
}

/** What the NexTalk team sees in their dashboard — never sent to WhatsApp (see template.ts's buildContent for the same pattern). */
export function buildPixReminderContent(input: PixReminderTemplateInput): string {
  const name = firstName(input.patientFullName);
  return `Olá, ${name}! Vimos que o PIX da sua consulta com ${input.doctorName}, em ${input.dateLabel} às ${input.timeH} (horário de Brasília), ainda não foi pago.

Ele vale até ${input.expirationTimeH}. Depois disso o horário é liberado e será preciso escolher outro.`;
}
