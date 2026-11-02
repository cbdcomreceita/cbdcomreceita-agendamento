import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import { sendPixReminder } from "@/lib/whatsapp/send-pix-reminder";
import { formatDateBR, formatDateDDMMWeekday, formatTimeH } from "@/lib/utils/datetime";

const REMINDER_DELAY_MS = 10 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function isPixReminderEnabled(): boolean {
  return process.env.WHATSAPP_PIX_REMINDER_ENABLED?.trim().toLowerCase() === "true";
}

type PendingPayment = {
  id: string;
  booking_id: string;
  created_at: string;
  expires_at: string | null;
  payment_token: string | null;
  bookings: {
    id: string;
    patient_id: string;
    scheduled_at: string;
    status: string;
    doctors: { name: string } | null;
    patients: {
      full_name: string;
      phone: string;
      email: string | null;
      whatsapp_consent: boolean;
    } | null;
  } | null;
};

/**
 * Expiration runs BEFORE reminders in the same tick: a payment can easily
 * be both past the 10-min reminder threshold and past its own expiry (2h
 * default) by the time a cron tick finds it, and a reminder for something
 * about to be marked expired in this same pass would be wasted/confusing.
 */
async function expireOverduePix(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{ expired: number }> {
  const nowIso = new Date().toISOString();

  const { data: overdue, error } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("status", "pending")
    .lt("expires_at", nowIso);

  if (error) {
    await logError({ scope: "whatsapp", message: "expireOverduePix: query failed", metadata: { error } });
    return { expired: 0 };
  }

  let expired = 0;
  for (const payment of overdue ?? []) {
    const { error: paymentError } = await supabase
      .from("payments")
      .update({ status: "expired" })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (paymentError) {
      await logError({
        scope: "whatsapp",
        message: "expireOverduePix: payment update failed",
        metadata: { error: paymentError, paymentId: payment.id },
      });
      continue;
    }

    await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("id", payment.booking_id)
      .eq("status", "awaiting_payment");

    await supabase.from("audit_events").insert({
      event_type: "pix_expired",
      entity_type: "booking",
      entity_id: payment.booking_id,
      metadata: { paymentId: payment.id },
    });
    expired++;
  }

  return { expired };
}

async function sendPixReminders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{ sent: number; skippedNoConsent: number; skippedFlagOff: number; skippedDuplicate: number; failed: number }> {
  const enabled = isPixReminderEnabled();
  const cutoff = new Date(Date.now() - REMINDER_DELAY_MS).toISOString();

  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      "id, booking_id, created_at, expires_at, payment_token, bookings(id, patient_id, scheduled_at, status, doctors(name), patients(full_name, phone, email, whatsapp_consent))"
    )
    .eq("status", "pending")
    .lte("created_at", cutoff);

  if (error) {
    await logError({ scope: "whatsapp", message: "sendPixReminders: query failed", metadata: { error } });
    return { sent: 0, skippedNoConsent: 0, skippedFlagOff: 0, skippedDuplicate: 0, failed: 0 };
  }

  // Cross-booking dedupe: one reminder per patient+scheduled_at, even if
  // that slot has more than one booking row (pre-dedupe-fix orphans, or a
  // patient who legitimately retried the same slot). Fetched once up
  // front — small table, avoids an embedded-filter query per payment.
  const { data: alreadyReminded } = await supabase
    .from("notifications_log")
    .select("bookings(patient_id, scheduled_at)")
    .eq("channel", "whatsapp")
    .eq("type", "payment_pending");

  const remindedSlots = new Set(
    (alreadyReminded ?? [])
      .map((row: { bookings: { patient_id: string; scheduled_at: string } | null }) => row.bookings)
      .filter((b: { patient_id: string; scheduled_at: string } | null): b is { patient_id: string; scheduled_at: string } => b !== null)
      .map((b: { patient_id: string; scheduled_at: string }) => `${b.patient_id}|${b.scheduled_at}`)
  );

  let sent = 0;
  let skippedNoConsent = 0;
  let skippedFlagOff = 0;
  let skippedDuplicate = 0;
  let failed = 0;

  for (const payment of (payments ?? []) as PendingPayment[]) {
    const booking = payment.bookings;
    if (!booking || booking.status !== "awaiting_payment") continue;
    const patient = booking.patients;
    const doctor = booking.doctors;
    if (!patient || !doctor || !payment.payment_token) continue;

    const slotKey = `${booking.patient_id}|${booking.scheduled_at}`;
    if (remindedSlots.has(slotKey)) {
      skippedDuplicate++;
      continue;
    }

    if (!patient.whatsapp_consent) {
      await supabase.from("audit_events").insert({
        event_type: "pix_reminder_skipped_no_consent",
        entity_type: "booking",
        entity_id: booking.id,
        metadata: { paymentId: payment.id },
      });
      skippedNoConsent++;
      continue;
    }

    const dateBR = formatDateBR(booking.scheduled_at);
    const dateLabel = formatDateDDMMWeekday(booking.scheduled_at);
    const timeH = formatTimeH(booking.scheduled_at);

    if (!enabled) {
      await supabase.from("audit_events").insert({
        event_type: "pix_reminder_skipped_flag_off",
        entity_type: "booking",
        entity_id: booking.id,
        metadata: { paymentId: payment.id, wouldSendTo: patient.phone },
      });
      skippedFlagOff++;
      // Still mark the slot as "handled" for this tick so the dry-run
      // audit trail doesn't repeat every 5 minutes while the flag is off.
      remindedSlots.add(slotKey);
      continue;
    }

    // Recheck right before sending — the payment could have been paid or
    // expired in the time between the query above and this iteration.
    const { data: recheck } = await supabase
      .from("payments")
      .select("status")
      .eq("id", payment.id)
      .maybeSingle();
    if (recheck?.status !== "pending") continue;

    const expirationTimeH = payment.expires_at ? formatTimeH(payment.expires_at) : timeH;

    const result = await sendPixReminder({
      bookingId: booking.id,
      patientId: booking.patient_id,
      patientFullName: patient.full_name,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorName: doctor.name,
      dateBR,
      dateLabel,
      timeH,
      expirationTimeH,
      paymentToken: payment.payment_token,
    });

    remindedSlots.add(slotKey);

    if (result.status === "sent") {
      sent++;
      await supabase.from("audit_events").insert({
        event_type: "pix_reminder_sent",
        entity_type: "booking",
        entity_id: booking.id,
        metadata: { paymentId: payment.id },
      });
    } else if (result.status === "failed") {
      failed++;
      await supabase.from("audit_events").insert({
        event_type: "pix_reminder_failed",
        entity_type: "booking",
        entity_id: booking.id,
        metadata: { paymentId: payment.id, error: result.error },
      });
    }
  }

  return { sent, skippedNoConsent, skippedFlagOff, skippedDuplicate, failed };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const expiry = await expireOverduePix(supabase);
  const reminders = await sendPixReminders(supabase);

  return NextResponse.json({
    success: true,
    expired: expiry.expired,
    reminders,
    timestamp: new Date().toISOString(),
  });
}
