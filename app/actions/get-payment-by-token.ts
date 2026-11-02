"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";

export interface PaymentByTokenResult {
  found: boolean;
  bookingId?: string;
  doctorName?: string;
  doctorCrm?: string;
  patientName?: string;
  scheduledAt?: string;
  paymentStatus?: string;
  bookingStatus?: string;
  meetLink?: string | null;
  mpPaymentId?: number | null;
  qrCode?: string;
  qrCodeBase64?: string;
  expiresAt?: string;
  amountCents?: number;
  couponApplied?: string | null;
}

/**
 * Looks up a payment by its reopen token (see payment_token in
 * generate-pix.ts) for /pagamento/[token] — reopens the same PIX without
 * ever calling generatePix again. Read-only: never mutates state, never
 * calls Mercado Pago.
 */
export async function getPaymentByToken(token: string): Promise<PaymentByTokenResult> {
  if (!token.trim()) return { found: false };

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("payments")
    .select(
      "status, mp_payment_id, mp_qr_code, mp_qr_code_base64, expires_at, amount_cents, coupon_code, bookings(id, scheduled_at, status, meet_link, patients(full_name), doctors(name, crm, crm_uf))"
    )
    .eq("payment_token", token)
    .maybeSingle();

  if (error) {
    await logError({
      scope: "create",
      message: "getPaymentByToken: query failed",
      metadata: { error },
    });
    return { found: false };
  }

  if (!data) return { found: false };

  type BookingRow = {
    id: string;
    scheduled_at: string;
    status: string;
    meet_link: string | null;
    patients: { full_name: string } | null;
    doctors: { name: string; crm: string; crm_uf: string } | null;
  };
  const booking = data.bookings as unknown as BookingRow | null;
  if (!booking || !booking.patients || !booking.doctors) {
    return { found: false };
  }

  await supabase.from("audit_events").insert({
    event_type: "pix_token_opened",
    entity_type: "booking",
    entity_id: booking.id,
    metadata: { paymentStatus: data.status },
  });

  return {
    found: true,
    bookingId: booking.id,
    doctorName: booking.doctors.name,
    doctorCrm: `${booking.doctors.crm}/${booking.doctors.crm_uf}`,
    patientName: booking.patients.full_name,
    scheduledAt: booking.scheduled_at,
    paymentStatus: data.status,
    bookingStatus: booking.status,
    meetLink: booking.meet_link,
    mpPaymentId: data.mp_payment_id,
    qrCode: data.mp_qr_code ?? undefined,
    qrCodeBase64: data.mp_qr_code_base64 ?? undefined,
    expiresAt: data.expires_at ?? undefined,
    amountCents: data.amount_cents,
    couponApplied: data.coupon_code,
  };
}
