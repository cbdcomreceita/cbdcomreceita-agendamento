"use server";

import { createMpPayment, getMpPayment, isMpConfigured } from "./client";
import type { PatientFormData } from "@/lib/validation/patient";
import type { BookingData } from "@/lib/calcom/storage";

export interface PixPaymentResult {
  success: boolean;
  paymentId: string;
  mpPaymentId: number | null;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiresAt: string;
  isMock: boolean;
}

export interface PaymentStatusResult {
  status: "pending" | "approved" | "rejected" | "expired";
  isMock: boolean;
}

/**
 * Create a PIX payment. Uses Mercado Pago API if configured,
 * otherwise returns mock data for development.
 */
export async function createPixPayment(
  patient: PatientFormData,
  booking: BookingData
): Promise<PixPaymentResult> {
  const paymentId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (!isMpConfigured()) {
    // Mock mode for development
    return {
      success: true,
      paymentId,
      mpPaymentId: null,
      qrCode: "00020126580014br.gov.bcb.pix0136mock-pix-key-cbd-com-receita-dev5204000053039865802BR5925CBD COM RECEITA6009SAO PAULO62070503***6304MOCK",
      qrCodeBase64: "",
      ticketUrl: "",
      expiresAt,
      isMock: true,
    };
  }

  const nameParts = patient.fullName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  const mpResponse = await createMpPayment({
    transaction_amount: 49.9,
    payment_method_id: "pix",
    payer: {
      email: patient.email,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: "CPF",
        number: patient.cpf.replace(/\D/g, ""),
      },
    },
    description: `Consulta CBD com Receita - ${booking.doctorName}`,
    external_reference: paymentId,
  });

  return {
    success: true,
    paymentId,
    mpPaymentId: mpResponse.id,
    qrCode: mpResponse.point_of_interaction.transaction_data.qr_code,
    qrCodeBase64: mpResponse.point_of_interaction.transaction_data.qr_code_base64,
    ticketUrl: mpResponse.point_of_interaction.transaction_data.ticket_url,
    expiresAt: mpResponse.date_of_expiration || expiresAt,
    isMock: false,
  };
}

/**
 * Check payment status. Uses Mercado Pago API if configured,
 * otherwise returns pending (mock mode has a "simulate" button).
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
