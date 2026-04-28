"use server";

import { getMpPayment } from "./client";

export interface PaymentStatusResult {
  status: "pending" | "approved" | "rejected" | "expired";
  isMock: boolean;
}

/**
 * Server Action used by /pagamento polling to check payment status.
 * Real payments hit GET /v1/payments/{id} on Mercado Pago. When there
 * is no mp_payment_id (mock/dev mode), we just report "pending" and let
 * the caller stay on the waiting screen.
 *
 * createPixPayment lived here previously — it now belongs to
 * app/actions/create-booking.ts, which also persists patient/booking/
 * payment rows in Supabase before generating the PIX.
 */
export async function checkPaymentStatus(
  mpPaymentId: number | null
): Promise<PaymentStatusResult> {
  if (!mpPaymentId) {
    return { status: "pending", isMock: true };
  }

  const mp = await getMpPayment(mpPaymentId);
  const statusMap: Record<string, PaymentStatusResult["status"]> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    cancelled: "expired",
    in_process: "pending",
  };

  return {
    status: statusMap[mp.status] ?? "pending",
    isMock: false,
  };
}
