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
  const cpfClean = patient.cpf.replace(/\D/g, "");
  const phoneClean = patient.phone.replace(/\D/g, "");
  const cepClean = patient.cep.replace(/\D/g, "");

  // Extract date portion from ISO birthDate
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

  try {
    console.log("[Simulate] Patient payload:", JSON.stringify(patientPayload, null, 2));

    // Try insert first, if CPF exists update
    let dbPatient;
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("cpf", cpfClean)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("patients")
        .update(patientPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        console.error("[Simulate] Patient update error:", JSON.stringify(error));
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
        console.error("[Simulate] Patient insert error:", JSON.stringify(error));
        return { success: false, error: `Erro ao criar paciente: ${error.message}` };
      }
      dbPatient = data;
    }

    // 2. Find doctor UUID from Supabase. Be defensive: aceita o nome
    //    atual ou variantes anteriores (caso a migration ainda não tenha
    //    rodado em produção).
    const candidateNames = [doctor?.name, "Dr. Magno", "Dr. Magno Cruz"]
      .filter((n): n is string => !!n);
    const { data: dbDoctor } = await supabase
      .from("doctors")
      .select("id")
      .in("name", candidateNames)
      .limit(1)
      .maybeSingle();

    if (!dbDoctor?.id) {
      console.error("[Simulate] Doctor not found in DB. Tried:", candidateNames);
      return {
        success: false,
        error: `Médico não encontrado no banco: ${doctor?.name ?? "?"}`,
      };
    }

    // 3. Create booking
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
      console.error("[Simulate] Booking error:", JSON.stringify(bookingError));
      return { success: false, error: `Erro ao criar agendamento: ${bookingError.message}` };
    }

    // 4. Create payment
    await supabase.from("payments").insert({
      booking_id: dbBooking.id,
      amount_cents: 4990,
      status: "approved",
      method: "pix",
      paid_at: new Date().toISOString(),
      external_reference: `sim-${dbBooking.id}`,
    });

    // 5. Try Cal.com booking
    let meetLink: string | undefined;
    if (doctor?.calcomEventTypeId) {
      const calResult = await createCalcomBooking({
        eventTypeId: doctor.calcomEventTypeId,
        scheduledAt: booking.scheduledAt,
        patientName: patient.fullName,
        patientEmail: patient.email,
        doctorName: doctor.name,
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
      }
    }

    // 6. Try email
    const dateFormatted = format(
      parseISO(booking.scheduledAt),
      "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm",
      { locale: ptBR }
    );

    const emailResult = await sendBookingConfirmation({
      patientName: patient.fullName,
      patientEmail: patient.email,
      doctorName: doctor?.name ?? "Médico CBD com Receita",
      doctorCrm: doctor?.crm ? `CRM ${doctor.crm}/${doctor.crmUf}` : undefined,
      dateFormatted,
      duration: "25 minutos",
      meetLink,
    });
    if (!emailResult.success) {
      console.error("[Simulate] Email failed (non-fatal):", emailResult.error);
    }

    // 7. Audit
    await supabase.from("audit_events").insert({
      event_type: "payment_simulated",
      entity_type: "booking",
      entity_id: dbBooking.id,
      metadata: { doctorId: doctor?.id, patientCpf: cpfClean },
    });

    return { success: true, meetLink };
  } catch (err) {
    console.error("[Simulate] Unhandled error:", err);
    return { success: false, error: String(err) };
  }
}
