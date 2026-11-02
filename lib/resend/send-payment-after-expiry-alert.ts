"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";

const TEAM_EMAIL = process.env.TEAM_EMAIL || "contato@cbdcomreceita.com.br";

export interface PaymentAfterExpiryAlertInput {
  bookingId: string;
  conflictingBookingId: string;
  paymentId: string | null;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  dateBR: string;
  timeH: string;
  amountFormatted: string;
}

/**
 * Team-facing alert for the one case confirmBooking refuses to
 * auto-confirm: a payment approved by Mercado Pago AFTER the funnel cron
 * had already marked its booking `expired`, and another booking already
 * holds a `confirmed` slot for the same doctor+scheduled_at in the
 * meantime (see confirm-booking.ts step 3b). The payment is real and was
 * already recorded as approved by the caller — this email is the only
 * thing standing between that payment and a lost/forgotten booking, so a
 * human has to resolve it (reschedule or refund).
 */
export async function sendPaymentAfterExpiryAlert(input: PaymentAfterExpiryAlertInput): Promise<void> {
  const subject = `URGENTE: pagamento aprovado após expiração — horário ocupado (${input.dateBR} ${input.timeH})`;
  const body = [
    `${input.patientName} pagou a consulta com ${input.doctorName} em ${input.dateBR} às ${input.timeH},`,
    `mas o PIX já tinha sido marcado como expirado e outro agendamento já confirmou esse mesmo horário antes.`,
    ``,
    `O pagamento FOI registrado como aprovado (payment_id ${input.paymentId ?? "—"}), mas a consulta NÃO foi`,
    `confirmada automaticamente, para não duplicar o horário do médico.`,
    ``,
    `Ação necessária: falar com o paciente para reagendar ou reembolsar.`,
    ``,
    `Booking que pagou tarde: ${input.bookingId}`,
    `Booking que já ocupa o horário: ${input.conflictingBookingId}`,
    `Paciente: ${input.patientName} — ${input.patientEmail} — ${input.patientPhone}`,
    `Valor pago: ${input.amountFormatted}`,
  ].join("\n");

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping payment-after-expiry alert (mock mode)");
    return;
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: TEAM_EMAIL,
      subject,
      text: body,
    });
    if (error) {
      await logError({
        scope: "confirm",
        message: "payment-after-expiry alert send error",
        metadata: { error, bookingId: input.bookingId },
        entityType: "booking",
        entityId: input.bookingId,
      });
    }
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "payment-after-expiry alert threw",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
  }
}
