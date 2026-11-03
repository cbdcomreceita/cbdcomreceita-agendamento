import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import { sendPixReminder } from "@/lib/whatsapp/send-pix-reminder";
import { sendIntakeReminder } from "@/lib/whatsapp/send-intake-reminder";
import { sendIntakePendingAlert } from "@/lib/resend/send-intake-pending-alert";
import { isIntakeReminderEnabled } from "@/lib/whatsapp/config";
import { isAgenda3NextEnabled } from "@/app/actions/feature-flags";
import { releaseCalcomSlot } from "@/lib/calcom/reservations";
import { formatDateBR, formatDateDDMMWeekday, formatTimeH } from "@/lib/utils/datetime";

const REMINDER_DELAY_MS = 10 * 60 * 1000;
const INTAKE_REMINDER_WINDOW_MS = 12 * 60 * 60 * 1000; // 12h antes
const INTAKE_ALERT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2h antes

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
  amount_cents: number;
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

  // Entrega 3, item 4: "PIX expirado: apague a reserva". Resolved once per
  // tick, not per payment — same reasoning as every other flag check here.
  const agenda3Enabled = await isAgenda3NextEnabled();

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

    // Isolated lookup (not part of the main query above) so a missing
    // calcom_reservation_uid column — e.g. migration 0016 not applied yet —
    // can never affect the PIX-expiry path itself, only this one booking's
    // release attempt. Best-effort: the hold expires on its own regardless.
    if (agenda3Enabled) {
      const { data: bookingRow, error: lookupError } = await supabase
        .from("bookings")
        .select("calcom_reservation_uid")
        .eq("id", payment.booking_id)
        .maybeSingle();
      if (!lookupError && bookingRow?.calcom_reservation_uid) {
        await releaseCalcomSlot(bookingRow.calcom_reservation_uid);
      }
    }

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
      "id, booking_id, created_at, expires_at, payment_token, amount_cents, bookings(id, patient_id, scheduled_at, status, doctors(name), patients(full_name, phone, email, whatsapp_consent))"
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
      amountCents: payment.amount_cents,
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

type IntakePendingBooking = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  intake_token: string | null;
  doctors: { name: string; email: string } | null;
  patients: { full_name: string; phone: string } | null;
};

/**
 * Entrega 2, item 7 — two independent, one-time-per-booking notifications
 * for bookings still owing the prontuário (intake_required=true,
 * intake_completed_at IS NULL), scoped to status='confirmed' (an unpaid
 * booking never reaches the "consultation is happening soon" state the
 * reminder/alert are about):
 *
 *  - 12h antes: WhatsApp via lembrete_prontuario_12h (WHATSAPP_INTAKE_REMINDER_ENABLED).
 *    Dedup via the existing partial unique index on (booking_id, type)
 *    WHERE channel='whatsapp' (migration 0011) — same mechanism as the PIX
 *    reminder. When the flag is off, reserves + marks the row "skipped"
 *    immediately (same pattern as orchestrateConfirmation's team_only
 *    branch) so the dry-run doesn't repeat every cron tick.
 *  - 2h antes: e-mail ao médico + TEAM_EMAIL. No unique index for
 *    channel='email' exists, so dedup is a manual pre-fetch of already-
 *    alerted booking_ids, same pattern as the PIX reminder's cross-booking
 *    `remindedSlots` check.
 *
 * NEVER cancels anything automatically — both are notification-only.
 */
async function sendIntakeNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{
  remindersSent: number;
  remindersSkippedFlagOff: number;
  remindersFailed: number;
  alertsSent: number;
  alertsFailed: number;
}> {
  const now = Date.now();
  const reminderCutoff = new Date(now + INTAKE_REMINDER_WINDOW_MS).toISOString();
  const alertCutoff = new Date(now + INTAKE_ALERT_WINDOW_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: pending, error } = await supabase
    .from("bookings")
    .select(
      "id, patient_id, scheduled_at, intake_token, doctors(name, email), patients(full_name, phone)"
    )
    .eq("intake_required", true)
    .eq("status", "confirmed")
    .is("intake_completed_at", null)
    .gt("scheduled_at", nowIso)
    .lte("scheduled_at", reminderCutoff);

  if (error) {
    await logError({ scope: "whatsapp", message: "sendIntakeNotifications: query failed", metadata: { error } });
    return { remindersSent: 0, remindersSkippedFlagOff: 0, remindersFailed: 0, alertsSent: 0, alertsFailed: 0 };
  }

  const bookings = (pending ?? []) as IntakePendingBooking[];
  const bookingsNeedingAlert = bookings.filter((b) => b.scheduled_at <= alertCutoff);

  // Pre-fetch which of the <=2h bookings already got the e-mail alert —
  // no DB-level unique index for channel='email', so this is the manual
  // dedup (mirrors sendPixReminders' remindedSlots check above).
  let alreadyAlertedIds = new Set<string>();
  if (bookingsNeedingAlert.length > 0) {
    const { data: alreadyAlerted } = await supabase
      .from("notifications_log")
      .select("booking_id")
      .eq("channel", "email")
      .eq("type", "intake_pending_2h")
      .in("booking_id", bookingsNeedingAlert.map((b) => b.id));
    alreadyAlertedIds = new Set((alreadyAlerted ?? []).map((r: { booking_id: string }) => r.booking_id));
  }

  let remindersSent = 0;
  let remindersSkippedFlagOff = 0;
  let remindersFailed = 0;
  let alertsSent = 0;
  let alertsFailed = 0;
  const reminderEnabled = isIntakeReminderEnabled();

  for (const booking of bookings) {
    const doctor = booking.doctors;
    const patient = booking.patients;
    if (!doctor || !patient || !booking.intake_token) continue;

    const dateLabel = formatDateDDMMWeekday(booking.scheduled_at);
    const timeH = formatTimeH(booking.scheduled_at);
    const dateBR = formatDateBR(booking.scheduled_at);

    if (!reminderEnabled) {
      remindersSkippedFlagOff++;
    } else {
      const result = await sendIntakeReminder({
        bookingId: booking.id,
        patientId: booking.patient_id,
        patientFullName: patient.full_name,
        patientPhone: patient.phone,
        doctorName: doctor.name,
        dateLabel,
        timeH,
        intakeToken: booking.intake_token,
      });
      if (result.status === "sent") {
        remindersSent++;
        await supabase.from("audit_events").insert({
          event_type: "intake_reminder_sent",
          entity_type: "booking",
          entity_id: booking.id,
          metadata: {},
        });
      } else if (result.status === "failed") {
        remindersFailed++;
        await supabase.from("audit_events").insert({
          event_type: "intake_reminder_failed",
          entity_type: "booking",
          entity_id: booking.id,
          metadata: { error: result.error },
        });
      }
    }

    if (booking.scheduled_at <= alertCutoff && !alreadyAlertedIds.has(booking.id)) {
      // Reserve the slot first (insert a queued row) so a concurrent tick
      // can't send the same alert twice — mirrors reserveNotification's
      // insert-then-branch-on-unique-violation shape, but for channel='email'.
      const { error: reserveError } = await supabase.from("notifications_log").insert({
        booking_id: booking.id,
        patient_id: booking.patient_id,
        channel: "email",
        type: "intake_pending_2h",
        status: "queued",
        recipient: doctor.email,
      });
      if (reserveError) continue; // another tick/replica already reserved it

      const alertResult = await sendIntakePendingAlert({
        bookingId: booking.id,
        doctorEmail: doctor.email,
        patientName: patient.full_name,
        dateBR,
        timeH,
      });
      await supabase
        .from("notifications_log")
        .update({ status: alertResult.success ? "sent" : "failed", sent_at: alertResult.success ? new Date().toISOString() : null })
        .eq("booking_id", booking.id)
        .eq("channel", "email")
        .eq("type", "intake_pending_2h");

      if (alertResult.success) {
        alertsSent++;
        await supabase.from("audit_events").insert({
          event_type: "intake_pending_alert_sent",
          entity_type: "booking",
          entity_id: booking.id,
          metadata: {},
        });
      } else {
        alertsFailed++;
      }
    }
  }

  return { remindersSent, remindersSkippedFlagOff, remindersFailed, alertsSent, alertsFailed };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const expiry = await expireOverduePix(supabase);
  const reminders = await sendPixReminders(supabase);
  const intake = await sendIntakeNotifications(supabase);

  return NextResponse.json({
    success: true,
    expired: expiry.expired,
    reminders,
    intake,
    timestamp: new Date().toISOString(),
  });
}
