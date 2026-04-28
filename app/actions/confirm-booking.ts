"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { dispatchPostPaymentSideEffects } from "@/lib/post-payment/dispatch";
import { logError } from "@/lib/audit/log-error";
import { medicos } from "@/data/medicos";
import { formatDateLong } from "@/lib/utils/datetime";

export type ConfirmSource = "polling" | "webhook" | "cron";

export interface ConfirmBookingInput {
  bookingId: string;
  source: ConfirmSource;
}

export interface ConfirmBookingResult {
  success: boolean;
  meetLink?: string;
  alreadyProcessed?: boolean;
  error?: string;
}

/**
 * Phase 2 of the new payment flow.
 *
 * Loads the booking + patient + payment + doctor from Supabase by ID and
 * runs all post-payment side effects: MP verification, Cal.com booking,
 * patient/doctor/team emails, Google Sheets row, and the audit trail.
 *
 * The action is idempotent: if the booking is already `confirmed`, it
 * returns the existing meet_link without re-running anything. Source
 * (polling/webhook/cron) is recorded in the audit event so we can tell
 * which path finalized each booking.
 *
 * Unlike the old confirmPayment, this no longer trusts sessionStorage —
 * the database is the single source of truth.
 */
export async function confirmBooking(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  const { bookingId, source } = input;
  const supabase = createServiceClient();

  console.log("[confirmBooking] invoked", { bookingId, source });

  // Audit invocation up front so we can prove the action ran even if a
  // later step throws before the success audit at the end.
  try {
    await supabase.from("audit_events").insert({
      event_type: "payment_confirm_started",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { source },
    });
  } catch (err) {
    console.error("[confirmBooking] failed to write start audit:", err);
  }

  try {
    // 1. Fetch booking with joined patient + payments + doctor
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, patients(*), payments(*), doctors(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      await logError({
        scope: "confirm",
        message: "Booking not found",
        metadata: { bookingId, error: bookingError },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: `Agendamento não encontrado: ${bookingId}` };
    }

    // 2. Idempotency
    if (booking.status === "confirmed") {
      await supabase.from("audit_events").insert({
        event_type: "payment_confirm_idempotent_skip",
        entity_type: "booking",
        entity_id: bookingId,
        metadata: { source, status: booking.status },
      });
      return {
        success: true,
        alreadyProcessed: true,
        meetLink: booking.meet_link ?? undefined,
      };
    }

    // 3. Verify MP if there's a real payment id
    type PaymentRow = {
      id: string;
      mp_payment_id: number | null;
      amount_cents: number;
    };
    const payments = (Array.isArray(booking.payments)
      ? booking.payments
      : booking.payments
        ? [booking.payments]
        : []) as PaymentRow[];
    const payment = payments[0];

    if (payment?.mp_payment_id) {
      const mp = await getMpPayment(payment.mp_payment_id);
      if (mp.status !== "approved") {
        return {
          success: false,
          error: `MP status é ${mp.status}, esperado approved`,
        };
      }
    }

    // 4. Find doctor in medicos array (DB row only has the name; the
    //    array has calcomEventTypeId, email, etc.)
    type DoctorRow = { id: string; name: string };
    const dbDoctor = booking.doctors as DoctorRow | null;
    const doctor = dbDoctor ? medicos.find((m) => m.name === dbDoctor.name) : undefined;
    if (!doctor) {
      await logError({
        scope: "confirm",
        message: "Doctor not found in medicos array",
        metadata: { bookingId, dbDoctorName: dbDoctor?.name },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Médico não encontrado em medicos.ts" };
    }

    type PatientRow = {
      id: string;
      full_name: string;
      email: string;
      phone: string;
      cpf: string;
      rg: string;
      birth_date: string;
      address_street: string;
      address_number: string;
      address_complement: string | null;
      address_district: string;
      address_city: string;
      address_state: string;
      address_zipcode: string;
      selected_symptoms: string[] | null;
      has_current_medication: boolean | null;
      current_medications: string | null;
      prior_cbd_use: string | null;
      lgpd_consent_at: string;
      terms_consent_at: string;
    };
    const patient = booking.patients as PatientRow | null;
    if (!patient) {
      await logError({
        scope: "confirm",
        message: "Patient not found via join",
        metadata: { bookingId },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Paciente não encontrado" };
    }

    // 5. Mark booking confirmed and payment approved
    const paidAt = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (payment) {
      await supabase
        .from("payments")
        .update({ status: "approved", paid_at: paidAt })
        .eq("id", payment.id);
    }

    // 6. Cal.com booking
    let meetLink: string | undefined;
    if (doctor.calcomEventTypeId) {
      const calResult = await createCalcomBooking({
        eventTypeId: doctor.calcomEventTypeId,
        scheduledAt: booking.scheduled_at,
        patientName: patient.full_name,
        patientEmail: patient.email,
        doctorName: doctor.name,
        notes: `Sintomas: ${(patient.selected_symptoms || []).join(", ")}`,
        metadata: { bookingId, source: `cbdcomreceita-${source}` },
      });

      if (calResult.success) {
        meetLink = calResult.meetLink;
        await supabase
          .from("bookings")
          .update({
            calcom_booking_id: calResult.bookingId,
            calcom_booking_uid: calResult.bookingUid,
            meet_link: calResult.meetLink,
          })
          .eq("id", bookingId);
      }
    }

    // 7. Patient confirmation email
    const dateFormatted = formatDateLong(booking.scheduled_at);
    await sendBookingConfirmation({
      patientName: patient.full_name,
      patientEmail: patient.email,
      doctorName: doctor.name,
      doctorCrm: doctor.crm ? `CRM ${doctor.crm}/${doctor.crmUf}` : undefined,
      dateFormatted,
      duration: "25 minutos",
      meetLink,
    });

    // 8. Doctor intake + team intake + Google Sheets
    type TriageJson = {
      duration?: string | null;
      priorTreatment?: string | null;
      priorTreatmentDetails?: string | null;
    };
    const triageData = (booking.triage_data ?? {}) as TriageJson;

    await dispatchPostPaymentSideEffects({
      patient: {
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        cpf: patient.cpf,
        rg: patient.rg,
        birth_date: patient.birth_date,
        address_street: patient.address_street,
        address_number: patient.address_number,
        address_complement: patient.address_complement,
        address_district: patient.address_district,
        address_city: patient.address_city,
        address_state: patient.address_state,
        address_zipcode: patient.address_zipcode,
        selected_symptoms: patient.selected_symptoms ?? [],
        has_current_medication: patient.has_current_medication ?? false,
        current_medications: patient.current_medications,
        prior_cbd_use: patient.prior_cbd_use,
        duration: triageData.duration ?? null,
        prior_treatment: triageData.priorTreatment ?? null,
        prior_treatment_details: triageData.priorTreatmentDetails ?? null,
        lgpd_consent_at: patient.lgpd_consent_at,
        terms_consent_at: patient.terms_consent_at,
      },
      doctor: {
        name: doctor.name,
        email: doctor.email,
        crm: doctor.crm,
        crmUf: doctor.crmUf,
      },
      booking: {
        scheduled_at: booking.scheduled_at,
        meet_link: meetLink ?? null,
      },
      payment: {
        amount_cents: payment?.amount_cents ?? 4990,
        status: "approved",
        paid_at: paidAt,
      },
    });

    // 9. Audit
    const eventType =
      source === "webhook"
        ? "payment_confirmed_via_webhook"
        : source === "cron"
          ? "payment_confirmed_via_cron"
          : "payment_confirmed_via_polling";
    await supabase.from("audit_events").insert({
      event_type: eventType,
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { source, meetLink, doctorId: doctor.id },
    });

    return { success: true, meetLink };
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "Unhandled error in confirmBooking",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
        bookingId,
        source,
      },
      entityType: "booking",
      entityId: bookingId,
    });
    return { success: false, error: String(err) };
  }
}
