"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { BookingReminderEmail } from "@/emails/booking-reminder";
import { logError } from "@/lib/audit/log-error";

interface SendReminderParams {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  dateFormatted: string;
  meetLink?: string;
  reminderType: "24h" | "1h";
}

export async function sendBookingReminder(
  params: SendReminderParams
): Promise<{ success: boolean; error?: string }> {
  const subjectMap = {
    "24h": "Lembrete: sua consulta é amanhã",
    "1h": "Sua consulta começa em 1 hora",
  };

  if (!isResendConfigured()) {
    console.log(`[MOCK] Lembrete ${params.reminderType} seria enviado pra ${params.patientEmail}`);
    return { success: true };
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: params.patientEmail,
      subject: `${subjectMap[params.reminderType]} — CBD com Receita`,
      react: BookingReminderEmail({
        patientName: params.patientName,
        doctorName: params.doctorName,
        dateFormatted: params.dateFormatted,
        meetLink: params.meetLink,
        reminderType: params.reminderType,
      }),
    });

    if (error) {
      await logError({
        scope: "resend",
        message: `Reminder ${params.reminderType} send error`,
        metadata: { error, to: params.patientEmail, reminderType: params.reminderType },
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    await logError({
      scope: "resend",
      message: `Reminder ${params.reminderType} threw`,
      metadata: { error: String(err), to: params.patientEmail, reminderType: params.reminderType },
    });
    return { success: false, error: String(err) };
  }
}
