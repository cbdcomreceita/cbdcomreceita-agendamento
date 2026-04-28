import { NextRequest, NextResponse } from "next/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { dispatchPostPaymentSideEffects } from "@/lib/post-payment/dispatch";
import { logError } from "@/lib/audit/log-error";
import { createServiceClient } from "@/lib/supabase/server";
import { medicos } from "@/data/medicos";
import { formatDateLong } from "@/lib/utils/datetime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP sends various notification types — we only care about payment
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) {
      await logError({
        scope: "webhook",
        message: "No payment ID in MP webhook payload",
        metadata: { body },
      });
      return NextResponse.json({ received: true });
    }

    // Fetch full payment from MP API
    let mpPayment;
    try {
      mpPayment = await getMpPayment(mpPaymentId);
    } catch (err) {
      await logError({
        scope: "webhook",
        message: "Failed to fetch MP payment",
        metadata: { error: String(err), mpPaymentId },
      });
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Find our payment by mp_payment_id
    const { data: payment } = await supabase
      .from("payments")
      .select("*, bookings(*)")
      .eq("mp_payment_id", mpPaymentId)
      .single();

    if (!payment) {
      await logError({
        scope: "webhook",
        message: "Payment not found for mp_payment_id",
        metadata: { mpPaymentId },
      });
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already processed
    if (payment.status === "approved" && mpPayment.status === "approved") {
      return NextResponse.json({ received: true, already_processed: true });
    }

    const booking = payment.bookings;

    if (mpPayment.status === "approved") {
      // 1. Update payment
      await supabase
        .from("payments")
        .update({
          status: "approved",
          paid_at: new Date().toISOString(),
          raw_webhook_data: body,
        })
        .eq("id", payment.id);

      // 2. Update booking
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id);

      // 3. Get patient data
      const { data: patient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", booking.patient_id)
        .single();

      if (!patient) {
        await logError({
          scope: "webhook",
          message: "Patient not found for booking",
          metadata: { bookingId: booking.id, patientId: booking.patient_id },
          entityType: "booking",
          entityId: booking.id,
        });
        return NextResponse.json({ received: true });
      }

      // 4. Find doctor — lookup by booking.doctor_id, then map to medicos
      //    array by name (which has the calcomEventTypeId, email, etc.)
      let doctor: (typeof medicos)[number] | undefined;
      if (booking.doctor_id) {
        const { data: dbDoctor } = await supabase
          .from("doctors")
          .select("name")
          .eq("id", booking.doctor_id)
          .maybeSingle();
        if (dbDoctor?.name) {
          doctor = medicos.find((d) => d.name === dbDoctor.name);
        }
      }
      if (!doctor) {
        await logError({
          scope: "webhook",
          message: "Doctor not resolved for booking",
          metadata: { bookingId: booking.id, doctorId: booking.doctor_id },
          entityType: "booking",
          entityId: booking.id,
        });
      }

      // 5. Create Cal.com booking
      let meetLink: string | undefined;
      if (doctor?.calcomEventTypeId) {
        const calResult = await createCalcomBooking({
          eventTypeId: doctor.calcomEventTypeId,
          scheduledAt: booking.scheduled_at,
          patientName: patient.full_name,
          patientEmail: patient.email,
          doctorName: doctor.name,
          notes: `Sintomas: ${(patient.selected_symptoms || []).join(", ")}`,
          metadata: {
            bookingId: booking.id,
            source: "cbdcomreceita",
          },
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
            .eq("id", booking.id);
        } else {
          // Don't cancel payment — mark for manual review
          await logError({
            scope: "webhook",
            message: "Cal.com booking failed (post-payment)",
            metadata: { error: calResult.error, bookingId: booking.id },
            entityType: "booking",
            entityId: booking.id,
          });
        }
      }

      // 6. Send confirmation email
      const dateFormatted = formatDateLong(booking.scheduled_at);

      const emailResult = await sendBookingConfirmation({
        patientName: patient.full_name,
        patientEmail: patient.email,
        doctorName: doctor?.name ?? "Médico CBD com Receita",
        doctorCrm: doctor?.crm ? `CRM ${doctor.crm}/${doctor.crmUf}` : undefined,
        dateFormatted,
        duration: "25 minutos",
        meetLink,
      });

      // 7. Log notification
      await supabase.from("notifications_log").insert({
        booking_id: booking.id,
        patient_id: patient.id,
        channel: "email",
        type: "booking_confirmation",
        status: emailResult.success ? "sent" : "failed",
        recipient: patient.email,
        template_name: "booking-confirmation",
        error_message: emailResult.error,
      });

      // 8. Post-payment side effects: doctor intake, team intake, Sheets
      if (doctor) {
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
            duration: booking.triage_data?.duration ?? null,
            prior_treatment: booking.triage_data?.priorTreatment ?? null,
            prior_treatment_details: booking.triage_data?.priorTreatmentDetails ?? null,
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
            amount_cents: payment.amount_cents,
            status: "approved",
            paid_at: new Date().toISOString(),
          },
        });
      }

      // 9. Audit log
      await supabase.from("audit_events").insert({
        event_type: "payment_confirmed",
        entity_type: "payment",
        entity_id: payment.id,
        metadata: {
          mp_payment_id: mpPaymentId,
          booking_id: booking.id,
          amount_cents: payment.amount_cents,
        },
      });
    } else if (
      mpPayment.status === "rejected" ||
      mpPayment.status === "cancelled"
    ) {
      await supabase
        .from("payments")
        .update({
          status: mpPayment.status === "rejected" ? "rejected" : "expired",
          raw_webhook_data: body,
        })
        .eq("id", payment.id);

      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    await logError({
      scope: "webhook",
      message: "Unhandled error in MP webhook",
      metadata: { error: String(err), stack: err instanceof Error ? err.stack : undefined },
    });
    // Always return 200 to prevent MP retries
    return NextResponse.json({ received: true, error: "internal" });
  }
}
