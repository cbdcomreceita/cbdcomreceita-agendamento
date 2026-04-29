import { NextRequest, NextResponse } from "next/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { verifyMercadoPagoWebhook } from "@/lib/mercadopago/verify-webhook";
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

    // ── HMAC signature verification ─────────────────────────────────
    // MP signs every webhook with x-signature (ts=<n>,v1=<hex>) using
    // HMAC-SHA256(MERCADOPAGO_WEBHOOK_SECRET, "id:<data_id>;request-id:<x-request-id>;ts:<ts>;").
    // Without this check, anyone with the URL could POST a fake
    // "payment.approved" body and trigger a real booking confirmation.
    const supabase = createServiceClient();

    const signature = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id");
    const queryDataId = req.nextUrl.searchParams.get("data.id");
    const bodyDataId =
      body?.data?.id !== undefined && body.data.id !== null
        ? String(body.data.id)
        : null;
    const dataId = bodyDataId ?? queryDataId;
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || null;

    if (!secret) {
      // Don't block — if the env var hasn't propagated yet, blocking
      // would cause Mercado Pago to retry forever and miss real
      // payments. Log loudly so we notice in audit.
      console.error("[webhook-mp] MERCADOPAGO_WEBHOOK_SECRET not configured");
      await supabase.from("audit_events").insert({
        event_type: "webhook_signature_skipped_no_secret",
        entity_type: "payment",
        metadata: {
          requestId,
          dataId,
          signaturePrefix: signature ? signature.slice(0, 20) : null,
        },
      });
    } else {
      const verify = verifyMercadoPagoWebhook({
        signature,
        requestId,
        dataId,
        secret,
      });
      if (!verify.valid) {
        await supabase.from("audit_events").insert({
          event_type: "webhook_signature_invalid",
          entity_type: "payment",
          metadata: {
            reason: verify.reason,
            requestId,
            dataId,
            signaturePrefix: signature ? signature.slice(0, 20) : null,
          },
        });
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
    // ─────────────────────────────────────────────────────────────────

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
