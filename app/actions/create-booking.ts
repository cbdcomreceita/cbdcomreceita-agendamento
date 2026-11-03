"use server";

import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import {
  rateLimiters,
  tryCheckRateLimit,
  getClientIp,
  maskIp,
} from "@/lib/rate-limit";
import { getDoctorById } from "@/app/actions/get-doctors";
import { isLightFormEnabled } from "@/app/actions/feature-flags";
import type { PatientFormData } from "@/lib/validation/patient";
import type { BookingData } from "@/lib/calcom/storage";
import type { TriageData } from "@/lib/triagem/schemas";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateBookingInput {
  patient: PatientFormData;
  booking: BookingData;
  triage: Partial<TriageData>;
}

export interface CreateBookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  /** Seconds the caller should wait before retrying (set on 429). */
  retryAfter?: number;
}

/**
 * Phase 1 of the payment flow.
 *
 * Persists the patient + booking (status='awaiting_payment') in Supabase
 * BEFORE any payment happens. The premise: as soon as the patient fills
 * the form, the lead already lives in the database, so neither a closed
 * tab nor an abandoned checkout loses it. PIX generation is a separate
 * step (app/actions/generate-pix.ts) — split out so the patient can enter
 * a coupon before the PIX is created, without creating a duplicate
 * booking row on every regeneration.
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { patient, booking, triage } = input;
  const supabase = createServiceClient();

  console.log("[createBooking] invoked", {
    doctorId: booking.doctorId,
    scheduledAt: booking.scheduledAt,
  });

  // Rate limit BEFORE any DB write. 5/IP/10min. Fail-open if Upstash is
  // unreachable.
  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);
  const rl = await tryCheckRateLimit(rateLimiters.createBooking, ip);
  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    await supabase.from("audit_events").insert({
      event_type: "rate_limit_exceeded",
      entity_type: "rate_limit",
      metadata: {
        endpoint: "create-booking",
        ip: maskIp(ip),
        limit: rl.limit,
        retryAfter: retryAfterSec,
      },
    });
    return {
      success: false,
      error: "rate_limit_exceeded",
      retryAfter: retryAfterSec,
    };
  }

  try {
    const cpfClean = patient.cpf.replace(/\D/g, "");
    // patient.phone arrives already in E.164 (converted client-side via
    // patientPhoneE164 right after Zod validation) — must NOT run through
    // a digit-stripping replace here, or the leading "+" is lost and
    // normalizePhoneToVariants can no longer tell it apart from the legacy
    // digits-only shape.
    const phoneClean = patient.phone;
    const cepClean = patient.cep ? patient.cep.replace(/\D/g, "") : null;
    const birthDate = patient.birthDate?.slice(0, 10) || null;

    const patientPayload = {
      full_name: patient.fullName,
      email: patient.email,
      phone: phoneClean,
      cpf: cpfClean,
      rg: patient.rg || null,
      birth_date: birthDate,
      address_street: patient.street || null,
      address_number: patient.number || null,
      address_complement: patient.complement || null,
      address_district: patient.district || null,
      address_city: patient.city || null,
      address_state: patient.state || null,
      address_zipcode: cepClean,
      whatsapp_consent: patient.whatsappConsent === true,
      selected_symptoms: triage.selectedSymptoms || [],
      has_current_medication: patient.hasCurrentMedication || false,
      current_medications: patient.currentMedications || null,
      prior_cbd_use: triage.priorCbdUse || null,
      lgpd_consent_at: patient.lgpdConsentAt || new Date().toISOString(),
      terms_consent_at: patient.termsConsentAt || new Date().toISOString(),
    };

    // 1. Upsert patient by CPF
    let dbPatient;
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("cpf", cpfClean)
      .maybeSingle();

    if (existingPatient) {
      const { data, error } = await supabase
        .from("patients")
        .update(patientPayload)
        .eq("id", existingPatient.id)
        .select()
        .single();
      if (error) {
        await logError({
          scope: "create",
          message: "Patient update failed",
          metadata: { error, patientId: existingPatient.id, cpf: cpfClean },
          entityType: "patient",
          entityId: existingPatient.id,
        });
        return { success: false, error: `Erro ao atualizar paciente: ${error.message}` };
      }
      dbPatient = data;
    } else {
      const { data, error } = await supabase
        .from("patients")
        .insert(patientPayload)
        .select()
        .single();
      if (error) {
        await logError({
          scope: "create",
          message: "Patient insert failed",
          metadata: { error, cpf: cpfClean, payload: patientPayload },
          entityType: "patient",
        });
        return { success: false, error: `Erro ao criar paciente: ${error.message}` };
      }
      dbPatient = data;
    }

    // 2. Doctor lookup — booking.doctorId must be a valid, active doctor
    //    UUID. A non-UUID here means a session started before this
    //    deploy (sessionStorage still holding the old short id).
    if (!UUID_RE.test(booking.doctorId)) {
      await logError({
        scope: "create",
        message: "doctorId is not a valid UUID (stale pre-deploy session)",
        metadata: { doctorId: booking.doctorId },
        entityType: "doctor",
      });
      return { success: false, error: "invalid_doctor_session" };
    }

    const doctor = await getDoctorById(booking.doctorId);
    if (!doctor || !doctor.is_active) {
      await logError({
        scope: "create",
        message: "Doctor not found or inactive",
        metadata: { doctorId: booking.doctorId },
        entityType: "doctor",
      });
      return { success: false, error: "invalid_doctor_session" };
    }

    const triageDataPayload = {
      symptoms: triage.selectedSymptoms,
      duration: triage.duration,
      priorTreatment: triage.priorTreatment,
      priorTreatmentDetails: triage.priorTreatmentDetails,
      priorCbdUse: triage.priorCbdUse,
      isMinor: triage.isMinor,
      isElderly: triage.isElderly,
    };

    // 3. Reuse an existing awaiting_payment booking for the same
    // patient+doctor+slot if one already exists (idx_bookings_dedupe) —
    // otherwise every /pagamento refresh inserted a brand-new orphaned
    // booking row. Refreshes triage_data so a change made before the
    // retry (e.g. a different symptom selection) isn't lost.
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("patient_id", dbPatient.id)
      .eq("doctor_id", doctor.id)
      .eq("scheduled_at", booking.scheduledAt)
      .eq("status", "awaiting_payment")
      .maybeSingle();

    let dbBooking;
    if (existingBooking) {
      // intake_required/intake_token are NOT touched here on purpose — they're
      // decided once, at creation (below), from the form variant active at
      // that moment. A reused awaiting_payment row keeps whatever was set then.
      const { data, error } = await supabase
        .from("bookings")
        .update({
          scheduled_end_at: booking.scheduledEndAt,
          triage_data: triageDataPayload,
        })
        .eq("id", existingBooking.id)
        .select()
        .single();
      if (error) {
        await logError({
          scope: "create",
          message: "Booking reuse (update) failed",
          metadata: { error, bookingId: existingBooking.id },
          entityType: "booking",
          entityId: existingBooking.id,
        });
        return { success: false, error: `Erro ao retomar agendamento: ${error.message}` };
      }
      dbBooking = data;
    } else {
      // Entrega 2: bookings created while the light /dados form is active
      // still owe RG/nascimento/endereço — intake_required flags that, and
      // intake_token is how /prontuario/[token] finds this booking later.
      // Resolved server-side (never trusts which schema the client actually
      // validated against), same pattern as getPixExpirationMinutes() etc.
      //
      // intake_required/intake_token are only ever added to the insert
      // payload when lightForm is true — NOT just set to false/null when
      // it's false. A plain `false`/`null` value still names the column,
      // and PostgREST rejects an insert that names a column the live
      // schema doesn't have yet (42703/PGRST204) — these two columns only
      // exist once migrations 0014/0015 are applied, which LIGHT_FORM_ENABLED
      // being off doesn't guarantee by itself. Omitting the keys entirely
      // when lightForm is false keeps every insert schema-safe regardless
      // of migration status, exactly like every other flagged feature here.
      const lightForm = await isLightFormEnabled();
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          patient_id: dbPatient.id,
          doctor_id: doctor.id,
          status: "awaiting_payment",
          scheduled_at: booking.scheduledAt,
          scheduled_end_at: booking.scheduledEndAt,
          triage_data: triageDataPayload,
          ...(lightForm
            ? { intake_required: true, intake_token: randomBytes(24).toString("base64url") }
            : {}),
        })
        .select()
        .single();

      if (error) {
        await logError({
          scope: "create",
          message: "Booking insert failed",
          metadata: { error, patientId: dbPatient.id, doctorId: doctor.id },
          entityType: "booking",
        });
        return {
          success: false,
          error: `Erro ao criar agendamento: ${error.message}`,
        };
      }
      dbBooking = data;
    }

    await supabase.from("audit_events").insert({
      event_type: "booking_created",
      entity_type: "booking",
      entity_id: dbBooking.id,
      metadata: { doctorId: doctor.id },
    });

    return { success: true, bookingId: dbBooking.id };
  } catch (err) {
    await logError({
      scope: "create",
      message: "Unhandled error in createBooking",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    return { success: false, error: String(err) };
  }
}
