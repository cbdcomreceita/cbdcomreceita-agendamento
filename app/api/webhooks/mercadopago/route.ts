import { NextRequest, NextResponse } from "next/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { confirmBooking } from "@/app/actions/confirm-booking";
import { logError } from "@/lib/audit/log-error";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Mercado Pago payment webhook.
 *
 * In the new flow, the patient/booking/payment rows are created BEFORE
 * the PIX is generated (see app/actions/create-booking.ts), so we can
 * always look the payment up here by its mp_payment_id and delegate to
 * the same confirmBooking action that polling uses. confirmBooking is
 * idempotent — if polling already confirmed the booking, we record an
 * audit event and return without rerunning side effects.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    const { data: payment } = await supabase
      .from("payments")
      .select("id, booking_id, status")
      .eq("mp_payment_id", mpPaymentId)
      .maybeSingle();

    if (!payment) {
      // After the refactor this should be impossible — the row is created
      // alongside the PIX. If we ever see this, log it loudly.
      await supabase.from("audit_events").insert({
        event_type: "webhook_payment_not_found",
        entity_type: "payment",
        metadata: { mpPaymentId, mpStatus: mpPayment.status },
      });
      return NextResponse.json({ received: true });
    }

    if (mpPayment.status === "approved") {
      // Stash the raw webhook body for forensic purposes
      await supabase
        .from("payments")
        .update({ raw_webhook_data: body })
        .eq("id", payment.id);

      // Idempotent confirmation. If polling already won, confirmBooking
      // returns alreadyProcessed=true without rerunning side effects.
      const result = await confirmBooking({
        bookingId: payment.booking_id,
        source: "webhook",
      });

      return NextResponse.json({
        received: true,
        already_processed: result.alreadyProcessed ?? false,
      });
    }

    if (mpPayment.status === "rejected" || mpPayment.status === "cancelled") {
      const status = mpPayment.status === "rejected" ? "rejected" : "expired";
      await supabase
        .from("payments")
        .update({ status, raw_webhook_data: body })
        .eq("id", payment.id);
      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", payment.booking_id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    await logError({
      scope: "webhook",
      message: "Unhandled error in MP webhook",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    return NextResponse.json({ received: true, error: "internal" });
  }
}
