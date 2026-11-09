"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";

const TEAM_EMAIL = process.env.TEAM_EMAIL || "contato@cbdcomreceita.com.br";

export interface SlotConflictAlertInput {
  bookingId: string;
  conflictingBookingId: string | null;
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
 * Team-facing alert for Entrega 3, item 2h: a payment was approved, but
 * Cal.com rejected the real booking creation because this exact slot was
 * won by someone else in the meantime (a reservation taken at PIX
 * generation normally prevents this — see generate-pix.ts's
 * slot_conflict_before_payment branch — but a reservation that already
 * expired, or was never taken at all, can still race here). The payment is
 * real and already recorded as approved — this email is the only thing
 * standing between that payment and a lost/forgotten booking, so a human
 * has to resolve it (reschedule or refund). Never auto-refunds.
 */
export async function sendSlotConflictAlert(input: SlotConflictAlertInput): Promise<void> {
  const subject = `URGENTE: pagamento aprovado, mas horário já ocupado no Cal.com (${input.dateBR} ${input.timeH})`;
  const body = [
    `${input.patientName} pagou a consulta com ${input.doctorName} em ${input.dateBR} às ${input.timeH},`,
    `mas o Cal.com recusou a criação da consulta porque esse horário já estava ocupado (reserva ou`,
    `consulta de outra pessoa venceu a corrida entre o momento em que ${input.patientName} escolheu o`,
    `horário e o momento em que o pagamento foi confirmado).`,
    ``,
    `O pagamento FOI registrado como aprovado (payment_id ${input.paymentId ?? "—"}), mas a consulta NÃO`,
    `foi criada no Cal.com. Este booking foi marcado com status 'payment_conflict' para facilitar o filtro.`,
    ``,
    `Ação necessária: falar com o paciente para reagendar ou reembolsar. Nenhum estorno foi feito`,
    `automaticamente.`,
    ``,
    `Booking que não conseguiu confirmar: ${input.bookingId}`,
    `Booking que já ocupa o horário (se encontrado no nosso banco): ${input.conflictingBookingId ?? "não encontrado — pode ser de outra fonte, conferir direto no Cal.com"}`,
    `Paciente: ${input.patientName} — ${input.patientEmail} — ${input.patientPhone}`,
    `Valor pago: ${input.amountFormatted}`,
  ].join("\n");

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping slot-conflict alert (mock mode)");
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
        message: "slot-conflict alert send error",
        metadata: { error, bookingId: input.bookingId },
        entityType: "booking",
        entityId: input.bookingId,
      });
    }
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "slot-conflict alert threw",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
  }
}
