import { formatDateBRShort, formatTimeH } from "@/lib/utils/datetime";

/** 2h before the consultation — the single rule for when the prontuário is due. */
export function getIntakeDeadline(scheduledAtIso: string | Date): Date {
  const scheduledAt = typeof scheduledAtIso === "string" ? new Date(scheduledAtIso) : scheduledAtIso;
  return new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
}

/** "05/11 às 17h30" — used by confirmacao_consulta_v2, lembrete_prontuario_12h, the confirmation page's destaque and the patient e-mail. */
export function formatIntakeDeadline(scheduledAtIso: string | Date): string {
  const deadline = getIntakeDeadline(scheduledAtIso);
  return `${formatDateBRShort(deadline)} às ${formatTimeH(deadline)}`;
}
