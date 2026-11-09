"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";

export interface SlotConflictPatientNoticeInput {
  bookingId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  dateBR: string;
  timeH: string;
}

/**
 * Patient-facing notice for Entrega 3, item 2h: sent only when a payment
 * went through but Cal.com rejected the real booking because someone else
 * won the race for that exact slot. Plain-text, same pattern as the
 * team-facing alert — no existing React Email template fits this specific
 * case and the message is short enough not to need one. Never mentions a
 * refund here; the team reaches out separately after the TEAM_EMAIL alert.
 */
export async function sendSlotConflictPatientNotice(
  input: SlotConflictPatientNoticeInput
): Promise<void> {
  const subject = "Precisamos que você escolha um novo horário para sua consulta";
  const body = [
    `Olá, ${input.patientName}.`,
    ``,
    `Recebemos seu pagamento, mas o horário de ${input.dateBR} às ${input.timeH} com ${input.doctorName} foi`,
    `reservado por outra pessoa poucos instantes antes da confirmação do seu pagamento.`,
    ``,
    `Nosso time vai entrar em contato em breve para reagendar sua consulta ou resolver o pagamento com`,
    `você. Se preferir, você também pode falar com a gente agora pelo WhatsApp: https://wa.me/5584997048210`,
    ``,
    `Pedimos desculpas pelo transtorno.`,
    ``,
    `Equipe CBD com Receita`,
  ].join("\n");

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping slot-conflict patient notice (mock mode)");
    return;
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: input.patientEmail,
      subject,
      text: body,
    });
    if (error) {
      await logError({
        scope: "confirm",
        message: "slot-conflict patient notice send error",
        metadata: { error, bookingId: input.bookingId },
        entityType: "booking",
        entityId: input.bookingId,
      });
    }
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "slot-conflict patient notice threw",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
  }
}
