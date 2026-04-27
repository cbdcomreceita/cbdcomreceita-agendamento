import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingReminder } from "@/lib/resend/send-reminder";
import { medicos } from "@/data/medicos";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIMEZONE } from "@/lib/utils/datetime";

async function sendReminders(
  type: "reminder_24h" | "reminder_1h",
  fromMs: number,
  toMs: number
) {
  const supabase = createServiceClient();
  const now = Date.now();
  const from = new Date(now + fromMs).toISOString();
  const to = new Date(now + toMs).toISOString();
  let sent = 0;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, patients(*)")
    .eq("status", "confirmed")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to);

  for (const booking of bookings ?? []) {
    // Skip if already sent
    const { data: existing } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("type", type)
      .limit(1);

    if (existing?.length) continue;

    const patient = booking.patients;
    if (!patient) continue;

    const doctor = medicos.find((d) => d.calcomEventTypeId !== null);
    const reminderType = type === "reminder_24h" ? "24h" : "1h";

    const dateFormatted =
      reminderType === "24h"
        ? formatInTimeZone(booking.scheduled_at, TIMEZONE, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
        : formatInTimeZone(booking.scheduled_at, TIMEZONE, "'Hoje às' HH:mm", { locale: ptBR });

    const result = await sendBookingReminder({
      patientName: patient.full_name,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico",
      dateFormatted,
      meetLink: booking.meet_link,
      reminderType,
    });

    await supabase.from("notifications_log").insert({
      booking_id: booking.id,
      patient_id: patient.id,
      channel: "email",
      type,
      status: result.success ? "sent" : "failed",
      recipient: patient.email,
      template_name: `booking-reminder-${reminderType}`,
      error_message: result.error,
    });

    sent++;
  }

  return sent;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const h = 60 * 60 * 1000;
  const m = 60 * 1000;

  const sent24h = await sendReminders("reminder_24h", 23 * h, 25 * h);
  const sent1h = await sendReminders("reminder_1h", 55 * m, 65 * m);

  return NextResponse.json({
    success: true,
    reminders_24h: sent24h,
    reminders_1h: sent1h,
    timestamp: new Date().toISOString(),
  });
}
