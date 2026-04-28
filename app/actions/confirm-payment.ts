"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { dispatchPostPaymentSideEffects } from "@/lib/post-payment/dispatch";
import { logError } from "@/lib/audit/log-error";
import { medicos } from "@/data/medicos";
import { formatDateLong } from "@/lib/utils/datetime";
import type { PatientFormData } from "@/lib/validation/patient";
import type { BookingData } from "@/lib/calcom/storage";
import type { TriageData } from "@/lib/triagem/schemas";

export interface ConfirmPaymentInput {
  patient: PatientFormData;
  booking: BookingData;
  triage: Partial<TriageData>;
  mpPaymentId: number | null;
  externalReference: string;
  /** Skips MP verification when there's no real payment (mock/dev mode). */
  isMock: boolean;
}

export interface ConfirmPaymentResult {
  success: boolean;
  meetLink?: string;
  bookingId?: string;
  alreadyProcessed?: boolean;
  error?: string;
}

/**
 * Server Action invoked by the /pagamento polling once Mercado Pago
 * reports the payment as approved. Replicates the side effects that the
 * MP webhook would run, but is the *primary* trigger so the user doesn't
 * land on /confirmacao before anything has happened. The webhook stays
 * as a backup; idempotency is enforced by checking the existing payment
 * row's status before re-running anything.
 */
export async function confirmPayment(
  input: ConfirmPaymentInput
): Promise<ConfirmPaymentResult> {
  const { patient, booking, triage, mpPaymentId, externalReference, isMock } = input;
  const supabase = createServiceClient();

  console.log(
    "[confirmPayment] invoked",
    JSON.stringify({ mpPaymentId, externalReference, isMock, doctorId: booking.doctorId })
  );

  // Audit the invocation up front so we can prove the action ran even if
  // it errors mid-flow before reaching the success audit at the end.
  try {
    await supabase.from("audit_events").insert({
      event_type: "payment_confirm_started",
      entity_type: "payment",
      metadata: {
        mpPaymentId,
        externalReference,
        isMock,
        doctorId: booking.doctorId,
      },
    });
  } catch (err) {
    console.error("[confirmPayment] failed to write start audit:", err);
  }

  try {
    // 1. Verify with Mercado Pago. Skip in mock mode (dev without MP keys).
    if (!isMock) {
      if (!mpPaymentId) {
        return { success: false, error: "mpPaymentId ausente em modo real" };
      }
      const mp = await getMpPayment(mpPaymentId);
      if (mp.status !== "approved") {
        return {
          success: false,
          error: `MP status é ${mp.status}, esperado approved`,
        };
      }
    }

    // 2. Idempotency: if a payment row with this external_reference already
    //    exists with status=approved AND a confirmed booking, return early
    //    with the existing data — the webhook (or a previous polling tick)
    //    already processed everything.
    const { data: existing } = await supabase
      .from("payments")
      .select("id, status, booking_id, bookings(id, status, meet_link)")
      .eq("external_reference", externalReference)
      .maybeSingle();

    type ExistingBooking = { id: string; status: string; meet_link: string | null };
    const existingBooking = existing?.bookings as ExistingBooking | null | undefined;
    if (
      existing?.status === "approved" &&
      existingBooking?.status === "confirmed"
    ) {
      await supabase.from("audit_events").insert({
        event_type: "payment_confirm_idempotent_skip",
        entity_type: "booking",
        entity_id: existingBooking.id,
        metadata: { mpPaymentId, externalReference },
      });
      return {
        success: true,
        alreadyProcessed: true,
        meetLink: existingBooking.meet_link ?? undefined,
        bookingId: existingBooking.id,
      };
    }

    // 3. Upsert patient by CPF
    const doctor = medicos.find((d) => d.id === booking.doctorId);
    const cpfClean = patient.cpf.replace(/\D/g, "");
    const phoneClean = patient.phone.replace(/\D/g, "");
    const cepClean = patient.cep.replace(/\D/g, "");
    const birthDate = patient.birthDate?.slice(0, 10) || null;

    const patientPayload = {
      full_name: patient.fullName,
      email: patient.email,
      phone: phoneClean,
      cpf: cpfClean,
      rg: patient.rg,
      birth_date: birthDate,
      address_street: patient.street,
      address_number: patient.number,
      address_complement: patient.complement || null,
      address_district: patient.district,
      address_city: patient.city,
      address_state: patient.state,
      address_zipcode: cepClean,
      selected_symptoms: triage.selectedSymptoms || [],
      has_current_medication: patient.hasCurrentMedication || false,
      current_medications: patient.currentMedications || null,
      prior_cbd_use: triage.priorCbdUse || null,
      lgpd_consent_at: patient.lgpdConsentAt || new Date().toISOString(),
      terms_consent_at: patient.termsConsentAt || new Date().toISOString(),
    };

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
          scope: "confirm",
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
          scope: "confirm",
          message: "Patient insert failed",
          metadata: { error, cpf: cpfClean, payload: patientPayload },
          entityType: "patient",
        });
        return { success: false, error: `Erro ao criar paciente: ${error.message}` };
      }
      dbPatient = data;
    }

    // 4. Doctor lookup (defensive: handle "Dr. Magno" / "Dr. Magno Cruz" rename)
    const candidateNames = [doctor?.name, "Dr. Magno", "Dr. Magno Cruz"]
      .filter((n): n is string => !!n);
    const { data: dbDoctor } = await supabase
      .from("doctors")
      .select("id")
      .in("name", candidateNames)
      .limit(1)
      .maybeSingle();

    if (!dbDoctor?.id) {
      await logError({
        scope: "confirm",
        message: "Doctor not found in DB",
        metadata: { candidateNames, expectedDoctor: doctor?.name },
        entityType: "doctor",
      });
      return {
        success: false,
        error: `Médico não encontrado no banco: ${doctor?.name ?? "?"}`,
      };
    }

    // 5. Create booking (status=confirmed)
    const { data: dbBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        patient_id: dbPatient.id,
        doctor_id: dbDoctor.id,
        status: "confirmed",
        scheduled_at: booking.scheduledAt,
        scheduled_end_at: booking.scheduledEndAt,
        triage_data: {
          symptoms: triage.selectedSymptoms,
          duration: triage.duration,
          priorCbdUse: triage.priorCbdUse,
          isMinor: triage.isMinor,
          isElderly: triage.isElderly,
        },
      })
      .select()
      .single();

    if (bookingError) {
      await logError({
        scope: "confirm",
        message: "Booking insert failed",
        metadata: {
          error: bookingError,
          patientId: dbPatient.id,
          doctorId: dbDoctor.id,
        },
        entityType: "booking",
      });
      return {
        success: false,
        error: `Erro ao criar agendamento: ${bookingError.message}`,
      };
    }

    // 6. Insert payment row (status=approved). Marks the flow as processed
    //    so a later webhook tick will skip via idempotency.
    await supabase.from("payments").insert({
      booking_id: dbBooking.id,
      mp_payment_id: mpPaymentId,
      external_reference: externalReference,
      amount_cents: 4990,
      status: "approved",
      method: "pix",
      paid_at: new Date().toISOString(),
    });

    // 7. Cal.com booking
    let meetLink: string | undefined;
    if (doctor?.calcomEventTypeId) {
      const calResult = await createCalcomBooking({
        eventTypeId: doctor.calcomEventTypeId,
        scheduledAt: booking.scheduledAt,
        patientName: patient.fullName,
        patientEmail: patient.email,
        doctorName: doctor.name,
        notes: `Sintomas: ${(triage.selectedSymptoms || []).join(", ")}`,
        metadata: { bookingId: dbBooking.id, source: "cbdcomreceita-polling" },
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
          .eq("id", dbBooking.id);
      }
    }

    // 8. Patient confirmation email (Resend)
    const dateFormatted = formatDateLong(booking.scheduledAt);
    await sendBookingConfirmation({
      patientName: patient.fullName,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico CBD com Receita",
      doctorCrm: doctor?.crm ? `CRM ${doctor.crm}/${doctor.crmUf}` : undefined,
      dateFormatted,
      duration: "25 minutos",
      meetLink,
    });

    // 9. Doctor intake, team intake, Google Sheets
    if (doctor) {
      await dispatchPostPaymentSideEffects({
        patient: {
          ...patientPayload,
          birth_date: birthDate ?? "",
          duration: triage.duration ?? null,
          prior_treatment: triage.priorTreatment ?? null,
          prior_treatment_details: triage.priorTreatmentDetails ?? null,
        },
        doctor: {
          name: doctor.name,
          email: doctor.email,
          crm: doctor.crm,
          crmUf: doctor.crmUf,
        },
        booking: {
          scheduled_at: booking.scheduledAt,
          meet_link: meetLink ?? null,
        },
        payment: {
          amount_cents: 4990,
          status: "approved",
          paid_at: new Date().toISOString(),
        },
      });
    }

    // 10. Audit: tag the path that confirmed the payment
    await supabase.from("audit_events").insert({
      event_type: "payment_confirmed_via_polling",
      entity_type: "booking",
      entity_id: dbBooking.id,
      metadata: {
        mpPaymentId,
        externalReference,
        doctorId: doctor?.id,
        meetLink,
      },
    });

    return { success: true, meetLink, bookingId: dbBooking.id };
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "Unhandled error in confirmPayment",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
        externalReference,
      },
    });
    return { success: false, error: String(err) };
  }
}
