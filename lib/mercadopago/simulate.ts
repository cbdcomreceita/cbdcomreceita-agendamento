"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { medicos } from "@/data/medicos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PatientFormData } from "@/lib/validation/patient";
import type { BookingData } from "@/lib/calcom/storage";
import type { TriageData } from "@/lib/triagem/schemas";

interface SimulateInput {
  patient: PatientFormData;
  booking: BookingData;
  triage: Partial<TriageData>;
}

export async function simulatePaymentApproved(input: SimulateInput) {
  const { patient, booking, triage } = input;
  const supabase = createServiceClient();

  const doctor = medicos.find((d) => d.id === booking.doctorId);

  try {
    // 1. Upsert patient
    const cpfClean = patient.cpf.replace(/\D/g, "");
    const { data: dbPatient, error: patientError } = await supabase
      .from("patients")
      .upsert(
        {
          full_name: patient.fullName,
          email: patient.email,
          phone: patient.phone.replace(/\D/g, ""),
          cpf: cpfClean,
          rg: patient.rg,
          birth_date: patient.birthDate,
          address_street: patient.street,
          address_number: patient.number,
          address_complement: patient.complement || null,
          address_district: patient.district,
          address_city: patient.city,
          address_state: patient.state,
          address_zipcode: patient.cep.replace(/\D/g, ""),
          selected_symptoms: triage.selectedSymptoms || [],
          has_current_medication: patient.hasCurrentMedication,
          current_medications: patient.currentMedications || null,
          prior_cbd_use: triage.priorCbdUse || null,
          lgpd_consent_at: patient.lgpdConsentAt || new Date().toISOString(),
          terms_consent_at: patient.termsConsentAt || new Date().toISOString(),
        },
        { onConflict: "cpf" }
      )
      .select()
      .single();

    if (patientError) {
      console.error("[Simulate] Patient upsert error:", patientError);
      return { success: false, error: "Erro ao salvar dados do paciente" };
    }

    // 2. Create booking
    const { data: dbBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        patient_id: dbPatient.id,
        doctor_id: doctor?.id || null,
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
      console.error("[Simulate] Booking insert error:", bookingError);
      return { success: false, error: "Erro ao criar agendamento" };
    }

    // 3. Create payment
    await supabase.from("payments").insert({
      booking_id: dbBooking.id,
      amount_cents: 4990,
      status: "approved",
      method: "pix",
      paid_at: new Date().toISOString(),
      external_reference: `sim-${dbBooking.id}`,
    });

    // 4. Try Cal.com booking
    let meetLink: string | undefined;
    if (doctor?.calcomEventTypeId) {
      const calResult = await createCalcomBooking({
        eventTypeId: doctor.calcomEventTypeId,
        scheduledAt: booking.scheduledAt,
        patientName: patient.fullName,
        patientEmail: patient.email,
        notes: `Sintomas: ${(triage.selectedSymptoms || []).join(", ")}`,
        metadata: { bookingId: dbBooking.id, source: "cbdcomreceita-sim" },
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
      } else {
        console.warn("[Simulate] Cal.com booking failed:", calResult.error);
      }
    }

    // 5. Try email
    const dateFormatted = format(
      parseISO(booking.scheduledAt),
      "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    await sendBookingConfirmation({
      patientName: patient.fullName,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico CBD com Receita",
      doctorCrm: doctor?.crm ? `CRM ${doctor.crm}/${doctor.crmUf}` : undefined,
      dateFormatted,
      duration: "25 minutos",
      meetLink,
    });

    // 6. Audit
    await supabase.from("audit_events").insert({
      event_type: "payment_simulated",
      entity_type: "booking",
      entity_id: dbBooking.id,
      metadata: { doctorId: doctor?.id, patientCpf: cpfClean },
    });

    return { success: true };
  } catch (err) {
    console.error("[Simulate] Error:", err);
    return { success: false, error: String(err) };
  }
}
