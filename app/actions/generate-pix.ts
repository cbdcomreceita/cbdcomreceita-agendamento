"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { createMpPayment, isMpConfigured } from "@/lib/mercadopago/client";
import { logError } from "@/lib/audit/log-error";
import {
  rateLimiters,
  tryCheckRateLimit,
  getClientIp,
  maskIp,
} from "@/lib/rate-limit";
import { validateCoupon, computeAmountCents, couponErrorMessage } from "@/lib/coupon/validate";

const BASE_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_CONSULTATION_PRICE ?? "4990");

export interface GeneratePixInput {
  bookingId: string;
  couponCode?: string;
}

export interface GeneratePixResult {
  success: boolean;
  paymentId?: string;
  mpPaymentId?: number | null;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  isMock?: boolean;
  amountCents?: number;
  couponApplied?: string | null;
  /** Non-blocking: PIX is still generated at full price when this is set. */
  couponError?: string;
  error?: string;
  retryAfter?: number;
}

/**
 * Phase 2 of the payment flow.
 *
 * Called when the patient clicks "Gerar PIX" on /pagamento, after
 * optionally entering a coupon. The discount is computed here, on the
 * server, from server-only env vars — the client only ever sends the
 * coupon *string*, never a price. Upserts (rather than always inserting)
 * the payment row keyed by booking_id, so a regeneration after expiry
 * updates the same row instead of leaving an orphaned one behind and
 * making confirm-booking's "first payment for this booking" lookup
 * ambiguous.
 */
export async function generatePix(input: GeneratePixInput): Promise<GeneratePixResult> {
  const { bookingId, couponCode } = input;
  const supabase = createServiceClient();

  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);
  const rl = await tryCheckRateLimit(rateLimiters.generatePix, ip);
  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    await supabase.from("audit_events").insert({
      event_type: "rate_limit_exceeded",
      entity_type: "rate_limit",
      metadata: {
        endpoint: "generate-pix",
        ip: maskIp(ip),
        limit: rl.limit,
        retryAfter: retryAfterSec,
      },
    });
    return { success: false, error: "rate_limit_exceeded", retryAfter: retryAfterSec };
  }

  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, patients(full_name, email, cpf), doctors(name)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      await logError({
        scope: "create",
        message: "generatePix: booking not found",
        metadata: { bookingId, error: bookingError },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Agendamento não encontrado" };
    }

    if (booking.status === "confirmed") {
      return { success: false, error: "Este agendamento já foi confirmado" };
    }

    type PatientRow = { full_name: string; email: string; cpf: string };
    type DoctorRow = { name: string };
    const patient = booking.patients as unknown as PatientRow | null;
    const doctor = booking.doctors as unknown as DoctorRow | null;
    if (!patient || !doctor) {
      await logError({
        scope: "create",
        message: "generatePix: missing patient/doctor join",
        metadata: { bookingId },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Dados do agendamento incompletos" };
    }

    // Coupon is validated and priced entirely server-side. An invalid or
    // expired coupon never blocks checkout — it just falls back to full
    // price with a message the UI can show inline.
    const coupon = validateCoupon(couponCode);
    const amountCents = computeAmountCents(BASE_PRICE_CENTS, coupon.discountPercent);
    const appliedCouponCode = coupon.valid ? (process.env.COUPON_CODE ?? null) : null;
    const couponError =
      !coupon.valid && couponCode?.trim() ? couponErrorMessage(coupon.reason) : undefined;

    // The code was right but the discount config is broken — this must
    // never fail silently (it did once: a matched coupon shipped at 0%
    // discount because COUPON_DISCOUNT_PERCENT wasn't set at runtime).
    if (!coupon.valid && coupon.codeMatched && coupon.reason === "not_configured") {
      await logError({
        scope: "create",
        message: "Coupon code matched but COUPON_DISCOUNT_PERCENT is missing or out of range",
        metadata: {
          bookingId,
          discountPercentRaw: process.env.COUPON_DISCOUNT_PERCENT ?? null,
        },
        entityType: "booking",
        entityId: bookingId,
      });
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingPayment?.status === "approved") {
      return { success: false, error: "Este pagamento já foi confirmado" };
    }

    let mpPaymentId: number | null = null;
    let qrCode = "";
    let qrCodeBase64 = "";
    let ticketUrl = "";
    let expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    let isMock = true;

    if (isMpConfigured()) {
      const cpfClean = patient.cpf.replace(/\D/g, "");
      const nameParts = patient.full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      try {
        const mpResp = await createMpPayment({
          transaction_amount: amountCents / 100,
          payment_method_id: "pix",
          payer: {
            email: patient.email,
            first_name: firstName,
            last_name: lastName,
            identification: { type: "CPF", number: cpfClean },
          },
          description: `Consulta CBD com Receita - ${doctor.name}`,
          external_reference: bookingId,
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
          message: "generatePix: MP createPayment failed",
          metadata: { error: String(err), bookingId },
          entityType: "booking",
          entityId: bookingId,
        });
        return { success: false, error: `Erro ao gerar PIX: ${String(err)}` };
      }
    } else {
      qrCode =
        "00020126580014br.gov.bcb.pix0136mock-pix-key-cbd-com-receita-dev5204000053039865802BR5925CBD COM RECEITA6009SAO PAULO62070503***6304MOCK";
    }

    const paymentPayload = {
      booking_id: bookingId,
      amount_cents: amountCents,
      coupon_code: appliedCouponCode,
      status: "pending",
      method: "pix",
      mp_payment_id: mpPaymentId,
      mp_qr_code: qrCode,
      mp_qr_code_base64: qrCodeBase64,
      mp_ticket_url: ticketUrl,
      external_reference: bookingId,
      expires_at: expiresAt,
    };

    let dbPayment;
    if (existingPayment) {
      const { data, error } = await supabase
        .from("payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id)
        .select()
        .single();
      if (error) {
        await logError({
          scope: "create",
          message: "Payment update failed",
          metadata: { error, bookingId, paymentId: existingPayment.id },
          entityType: "payment",
        });
        return { success: false, error: `Erro ao registrar pagamento: ${error.message}` };
      }
      dbPayment = data;
    } else {
      const { data, error } = await supabase
        .from("payments")
        .insert(paymentPayload)
        .select()
        .single();
      if (error) {
        await logError({
          scope: "create",
          message: "Payment insert failed",
          metadata: { error, bookingId },
          entityType: "payment",
        });
        return { success: false, error: `Erro ao registrar pagamento: ${error.message}` };
      }
      dbPayment = data;
    }

    // A prior attempt may have been cancelled by the MP webhook (rejected
    // PIX) — a fresh PIX un-cancels the booking rather than stranding the
    // patient on a dead slot.
    if (booking.status !== "awaiting_payment") {
      await supabase.from("bookings").update({ status: "awaiting_payment" }).eq("id", bookingId);
    }

    await supabase.from("audit_events").insert({
      event_type: "pix_generated",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: {
        paymentId: dbPayment.id,
        mpPaymentId,
        amountCents,
        couponCode: appliedCouponCode,
        isMock,
      },
    });

    return {
      success: true,
      paymentId: dbPayment.id,
      mpPaymentId,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expiresAt,
      isMock,
      amountCents,
      couponApplied: appliedCouponCode,
      couponError,
    };
  } catch (err) {
    await logError({
      scope: "create",
      message: "Unhandled error in generatePix",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
        bookingId,
      },
      entityType: "booking",
      entityId: bookingId,
    });
    return { success: false, error: String(err) };
  }
}
