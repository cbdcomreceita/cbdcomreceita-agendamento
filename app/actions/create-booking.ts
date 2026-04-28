"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createMpPayment, isMpConfigured } from "@/lib/mercadopago/client";
import { logError } from "@/lib/audit/log-error";
import { medicos } from "@/data/medicos";
import type { PatientFormData } from "@/lib/validation/patient";
import type { BookingData } from "@/lib/calcom/storage";
import type { TriageData } from "@/lib/triagem/schemas";

export interface CreateBookingInput {
  patient: PatientFormData;
  booking: BookingData;
  triage: Partial<TriageData>;
}

export interface CreateBookingResult {
  success: boolean;
  bookingId?: string;
  paymentId?: string;
  mpPaymentId?: number | null;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  isMock?: boolean;
  error?: string;
}

/**
 * Phase 1 of the new payment flow.
 *
 * Persists the patient/booking/payment in Supabase BEFORE generating the
 * PIX. The premise: once the QR code is shown, all the data already lives
 * in the database, so neither a closed browser tab nor a missing webhook
 * can lose the booking. The polling-driven confirmBooking and the MP
 * webhook are then both able to look the booking up by its UUID and run
 * the post-payment side effects idempotently.
 */
export async function createBookingAndPayment(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const { patient, booking, triage } = input;
  const supabase = createServiceClient();

  console.log("[createBooking] invoked", {
    doctorId: booking.doctorId,
    scheduledAt: booking.scheduledAt,
  });

  try {
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

    // 2. Doctor lookup
    const doctor = medicos.find((d) => d.id === booking.doctorId);
    const candidateNames = [doctor?.name, "Dr. Magno", "Dr. Magno Cruz"]
      .filter((n): n is string => !!n);
    const { data: dbDoctor } = await supabase
      .from("doctors")
      .select("id")
      .in("name", candidateNames)
      .limit(1)
      .maybeSingle();

    if (!dbDoctor?.id || !doctor) {
      await logError({
        scope: "create",
        message: "Doctor not found in DB",
        metadata: { candidateNames, expectedDoctor: doctor?.name },
        entityType: "doctor",
      });
      return {
        success: false,
        error: `Médico não encontrado: ${doctor?.name ?? "?"}`,
      };
    }

    // 3. Insert booking (status='awaiting_payment')
    const { data: dbBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        patient_id: dbPatient.id,
        doctor_id: dbDoctor.id,
        status: "awaiting_payment",
        scheduled_at: booking.scheduledAt,
        scheduled_end_at: booking.scheduledEndAt,
        triage_data: {
          symptoms: triage.selectedSymptoms,
          duration: triage.duration,
          priorTreatment: triage.priorTreatment,
          priorTreatmentDetails: triage.priorTreatmentDetails,
          priorCbdUse: triage.priorCbdUse,
          isMinor: triage.isMinor,
          isElderly: triage.isElderly,
        },
      })
      .select()
      .single();

    if (bookingError) {
      await logError({
        scope: "create",
        message: "Booking insert failed",
        metadata: { error: bookingError, patientId: dbPatient.id, doctorId: dbDoctor.id },
        entityType: "booking",
      });
      return {
        success: false,
        error: `Erro ao criar agendamento: ${bookingError.message}`,
      };
    }

    // 4. Generate PIX. external_reference = booking UUID, so the webhook
    //    can match this back even if our DB lookup ever changes.
    let mpPaymentId: number | null = null;
    let qrCode = "";
    let qrCodeBase64 = "";
    let ticketUrl = "";
    let expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    let isMock = true;

    if (isMpConfigured()) {
      const nameParts = patient.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      try {
        const mpResp = await createMpPayment({
          transaction_amount: 49.9,
          payment_method_id: "pix",
          payer: {
            email: patient.email,
            first_name: firstName,
            last_name: lastName,
            identification: { type: "CPF", number: cpfClean },
          },
          description: `Consulta CBD com Receita - ${doctor.name}`,
          external_reference: dbBooking.id,
        });
        mpPaymentId = mpResp.id;
        qrCode = mpResp.point_of_interaction.transaction_data.qr_code;
        qrCodeBase64 = mpResp.point_of_interaction.transaction_data.qr_code_base64;
        ticketUrl = mpResp.point_of_interaction.transaction_data.ticket_url;
        expiresAt = mpResp.date_of_expiration || expiresAt;
        isMock = false;
      } catch (err) {
        await logError({
          scope: "create",
          message: "MP createPayment failed",
          metadata: { error: String(err), bookingId: dbBooking.id },
          entityType: "booking",
          entityId: dbBooking.id,
        });
        return { success: false, error: `Erro ao gerar PIX: ${String(err)}` };
      }
    } else {
      qrCode =
        "00020126580014br.gov.bcb.pix0136mock-pix-key-cbd-com-receita-dev5204000053039865802BR5925CBD COM RECEITA6009SAO PAULO62070503***6304MOCK";
    }

    // 5. Insert payment row (status='pending')
    const { data: dbPayment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: dbBooking.id,
        amount_cents: 4990,
        status: "pending",
        method: "pix",
        mp_payment_id: mpPaymentId,
        mp_qr_code: qrCode,
        mp_qr_code_base64: qrCodeBase64,
        mp_ticket_url: ticketUrl,
        external_reference: dbBooking.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (paymentError) {
      await logError({
        scope: "create",
        message: "Payment insert failed",
        metadata: { error: paymentError, bookingId: dbBooking.id, mpPaymentId },
        entityType: "payment",
      });
      return {
        success: false,
        error: `Erro ao registrar pagamento: ${paymentError.message}`,
      };
    }

    await supabase.from("audit_events").insert({
      event_type: "booking_created",
      entity_type: "booking",
      entity_id: dbBooking.id,
      metadata: {
        paymentId: dbPayment.id,
        mpPaymentId,
        doctorId: doctor.id,
        isMock,
      },
    });

    return {
      success: true,
      bookingId: dbBooking.id,
      paymentId: dbPayment.id,
      mpPaymentId,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expiresAt,
      isMock,
    };
  } catch (err) {
    await logError({
      scope: "create",
      message: "Unhandled error in createBookingAndPayment",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    return { success: false, error: String(err) };
  }
}
