import { NextRequest, NextResponse } from "next/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { createServiceClient } from "@/lib/supabase/server";
import { medicos } from "@/data/medicos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP sends various notification types — we only care about payment
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const mpPaymentId = body.data?.id;
    if (!mpPaymentId) {
      console.error("[Webhook MP] No payment ID in payload");
      return NextResponse.json({ received: true });
    }

    // Fetch full payment from MP API
    let mpPayment;
    try {
      mpPayment = await getMpPayment(mpPaymentId);
    } catch (err) {
      console.error("[Webhook MP] Failed to fetch payment:", err);
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
      console.warn("[Webhook MP] Payment not found for mp_payment_id:", mpPaymentId);
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
        console.error("[Webhook MP] Patient not found for booking:", booking.id);
        return NextResponse.json({ received: true });
      }

      // 4. Find doctor
      const doctor = medicos.find(
        (d) => d.calcomEventTypeId !== null
      );

      // 5. Create Cal.com booking
      let meetLink: string | undefined;
      if (doctor?.calcomEventTypeId) {
        const calResult = await createCalcomBooking({
          eventTypeId: doctor.calcomEventTypeId,
          scheduledAt: booking.scheduled_at,
          patientName: patient.full_name,
          patientEmail: patient.email,
          doctorName: doctor.name,
          doctorEmail: doctor.email,
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
          console.error("[Webhook MP] Cal.com booking failed:", calResult.error);
          // Don't cancel payment — mark for manual review
          await supabase.from("audit_events").insert({
            event_type: "calcom_booking_failed",
            entity_type: "booking",
            entity_id: booking.id,
            metadata: { error: calResult.error },
          });
        }
      }

      // 6. Send confirmation email
      const dateFormatted = format(
        parseISO(booking.scheduled_at),
        "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR }
      );

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

      // 8. Audit log
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
    console.error("[Webhook MP] Unhandled error:", err);
    // Always return 200 to prevent MP retries
    return NextResponse.json({ received: true, error: "internal" });
  }
}
