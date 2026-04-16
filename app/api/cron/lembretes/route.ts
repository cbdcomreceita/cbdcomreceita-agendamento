import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { medicos } from "@/data/medicos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  let sent = 0;

  // Reminder 24h: bookings between 23h and 25h from now
  const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const to24h = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data: bookings24h } = await supabase
    .from("bookings")
    .select("*, patients(*)")
    .eq("status", "confirmed")
    .gte("scheduled_at", from24h)
    .lte("scheduled_at", to24h);

  for (const booking of bookings24h ?? []) {
    // Check if reminder already sent
    const { data: existing } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("type", "reminder_24h")
      .limit(1);

    if (existing?.length) continue;

    const patient = booking.patients;
    if (!patient) continue;

    const doctor = medicos.find((d) => d.calcomEventTypeId !== null);
    const dateFormatted = format(
      parseISO(booking.scheduled_at),
      "EEEE, d 'de' MMMM 'às' HH:mm",
      { locale: ptBR }
    );

    const result = await sendBookingConfirmation({
      patientName: patient.full_name,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico",
      dateFormatted,
      duration: "25 minutos",
      meetLink: booking.meet_link,
    });

    await supabase.from("notifications_log").insert({
      booking_id: booking.id,
      patient_id: patient.id,
      channel: "email",
      type: "reminder_24h",
      status: result.success ? "sent" : "failed",
      recipient: patient.email,
      template_name: "booking-confirmation",
      error_message: result.error,
    });

    sent++;
  }

  // Reminder 1h: bookings between 55min and 65min from now
  const from1h = new Date(now.getTime() + 55 * 60 * 1000).toISOString();
  const to1h = new Date(now.getTime() + 65 * 60 * 1000).toISOString();

  const { data: bookings1h } = await supabase
    .from("bookings")
    .select("*, patients(*)")
    .eq("status", "confirmed")
    .gte("scheduled_at", from1h)
    .lte("scheduled_at", to1h);

  for (const booking of bookings1h ?? []) {
    const { data: existing } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("type", "reminder_1h")
      .limit(1);

    if (existing?.length) continue;

    const patient = booking.patients;
    if (!patient) continue;

    const doctor = medicos.find((d) => d.calcomEventTypeId !== null);
    const dateFormatted = format(
      parseISO(booking.scheduled_at),
      "'Hoje às' HH:mm",
      { locale: ptBR }
    );

    const result = await sendBookingConfirmation({
      patientName: patient.full_name,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico",
      dateFormatted,
      duration: "25 minutos",
      meetLink: booking.meet_link,
    });

    await supabase.from("notifications_log").insert({
      booking_id: booking.id,
      patient_id: patient.id,
      channel: "email",
      type: "reminder_1h",
      status: result.success ? "sent" : "failed",
      recipient: patient.email,
      template_name: "booking-confirmation",
      error_message: result.error,
    });

    sent++;
  }

  return NextResponse.json({
    success: true,
    reminders_sent: sent,
    timestamp: now.toISOString(),
  });
}
