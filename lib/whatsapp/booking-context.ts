import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import { sendWhatsappAlert, type WhatsappAlertReason } from "@/lib/resend/send-whatsapp-alert";
import { formatDateBR, formatTimeH } from "@/lib/utils/datetime";

export interface BookingContext {
  bookingId: string;
  patientId: string;
  patientFullName: string;
  patientPhone: string;
  patientEmail: string;
  doctorName: string;
  dateBR: string;
  timeH: string;
  meetLink: string | null;
  amountCents: number;
}

export async function loadBookingContext(bookingId: string): Promise<BookingContext | null> {
  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*, patients(*), payments(*), doctors(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    await logError({
      scope: "whatsapp",
      message: "loadBookingContext: booking not found",
      metadata: { bookingId, error },
      entityType: "booking",
      entityId: bookingId,
    });
    return null;
  }

  const patient = booking.patients as { id: string; full_name: string; email: string; phone: string } | null;
  const doctor = booking.doctors as { name: string } | null;
  const payments = (Array.isArray(booking.payments) ? booking.payments : booking.payments ? [booking.payments] : []) as {
    amount_cents: number;
  }[];

  if (!patient || !doctor) {
    await logError({
      scope: "whatsapp",
      message: "loadBookingContext: missing patient or doctor via join",
      metadata: { bookingId, hasPatient: !!patient, hasDoctor: !!doctor },
      entityType: "booking",
      entityId: bookingId,
    });
    return null;
  }

  return {
    bookingId,
    patientId: patient.id,
    patientFullName: patient.full_name,
    patientPhone: patient.phone,
    patientEmail: patient.email,
    doctorName: doctor.name,
    dateBR: formatDateBR(booking.scheduled_at),
    timeH: formatTimeH(booking.scheduled_at),
    meetLink: booking.meet_link ?? null,
    amountCents: payments[0]?.amount_cents ?? 4990,
  };
}

export async function alertForBooking(
  reason: WhatsappAlertReason,
  ctx: BookingContext,
  detail: string
): Promise<void> {
  await sendWhatsappAlert({
    reason,
    bookingId: ctx.bookingId,
    patientName: ctx.patientFullName,
    patientPhoneRaw: ctx.patientPhone,
    patientEmail: ctx.patientEmail,
    dateBR: ctx.dateBR,
    timeH: ctx.timeH,
    doctorName: ctx.doctorName,
    detail,
  });
}
