const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const BASE_URL = "https://api.mercadopago.com";

export interface MpPixPaymentRequest {
  transaction_amount: number;
  payment_method_id: "pix";
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: { type: "CPF"; number: string };
  };
  description: string;
  external_reference: string;
}

export interface MpPixPaymentResponse {
  id: number;
  status: string;
  point_of_interaction: {
    transaction_data: {
      qr_code: string;
      qr_code_base64: string;
      ticket_url: string;
    };
  };
  date_of_expiration: string;
}

export async function createMpPayment(
  data: MpPixPaymentRequest
): Promise<MpPixPaymentResponse> {
  const res = await fetch(`${BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": data.external_reference,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Pago error ${res.status}: ${body}`);
  }

  return res.json();
}

export async function getMpPayment(
  paymentId: number
): Promise<{ id: number; status: string }> {
  const res = await fetch(`${BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago error ${res.status}`);
  }

  return res.json();
}

export function isMpConfigured(): boolean {
  return ACCESS_TOKEN.length > 0;
}
