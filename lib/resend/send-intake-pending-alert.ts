"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";

const TEAM_EMAIL = process.env.TEAM_EMAIL || "contato@cbdcomreceita.com.br";

export interface IntakePendingAlertInput {
  bookingId: string;
  doctorEmail: string;
  patientName: string;
  dateBR: string;
  timeH: string;
}

/**
 * Entrega 2, cron item 7 (2h antes da consulta) — ao médico e ao
 * TEAM_EMAIL, texto exato pedido pelo usuário. Nunca cancela nada
 * automaticamente: só avisa para o time tentar contato.
 */
export async function sendIntakePendingAlert(input: IntakePendingAlertInput): Promise<{ success: boolean }> {
  const subject = `Prontuário pendente: ${input.patientName} — ${input.dateBR} ${input.timeH}`;
  const body = `Prontuário pendente: ${input.patientName}, ${input.dateBR} ${input.timeH}. A paciente ainda não preencheu. Nosso time está tentando contato. A consulta segue confirmada, a menos que avisemos o contrário.`;

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping intake-pending alert (mock mode)");
    return { success: true };
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: [input.doctorEmail, TEAM_EMAIL],
      subject,
      text: body,
    });
    if (error) {
      await logError({
        scope: "resend",
        message: "intake-pending alert send error",
        metadata: { error, bookingId: input.bookingId },
        entityType: "booking",
        entityId: input.bookingId,
      });
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    await logError({
      scope: "resend",
      message: "intake-pending alert threw",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
    return { success: false };
  }
}
