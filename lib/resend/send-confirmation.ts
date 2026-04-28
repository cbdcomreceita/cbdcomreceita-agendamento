"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { logError } from "@/lib/audit/log-error";

interface SendConfirmationParams {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorCrm?: string;
  dateFormatted: string;
  duration: string;
  meetLink?: string;
}

export async function sendBookingConfirmation(
  params: SendConfirmationParams
): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping email (mock mode)");
    console.log("[Resend] Would send confirmation to:", params.patientEmail);
    return { success: true };
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: params.patientEmail,
      subject: `Consulta agendada com ${params.doctorName} — CBD com Receita`,
      react: BookingConfirmationEmail({
        patientName: params.patientName,
        doctorName: params.doctorName,
        doctorCrm: params.doctorCrm,
        dateFormatted: params.dateFormatted,
        duration: params.duration,
        meetLink: params.meetLink,
      }),
    });

    if (error) {
      await logError({
        scope: "resend",
        message: "Confirmation send error",
        metadata: { error, to: params.patientEmail, template: "booking-confirmation" },
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    await logError({
      scope: "resend",
      message: "Confirmation threw",
      metadata: { error: String(err), to: params.patientEmail, template: "booking-confirmation" },
    });
    return { success: false, error: String(err) };
  }
}
