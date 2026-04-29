import crypto from "node:crypto";

export interface VerifyParams {
  /** Raw value of the x-signature header. Format: "ts=<n>,v1=<hex>". */
  signature: string | null;
  /** Raw value of the x-request-id header (UUID). */
  requestId: string | null;
  /** body.data.id (string or number) — the payment id Mercado Pago is notifying us about. */
  dataId: string | null;
  /** MERCADOPAGO_WEBHOOK_SECRET from env. */
  secret: string | null;
}

export type VerifyFailureReason =
  | "missing_secret"
  | "missing_signature"
  | "missing_request_id"
  | "missing_data_id"
  | "invalid_signature_format"
  | "hash_mismatch";

export interface VerifyResult {
  valid: boolean;
  reason?: VerifyFailureReason;
}

/**
 * Verify the HMAC-SHA256 signature on a Mercado Pago webhook.
 *
 * Template (per MP docs):
 *   id:<data_id>;request-id:<x-request-id>;ts:<ts>;
 *
 * Hash:
 *   HMAC-SHA256(secret, template).hex() === v1
 *
 * Comparison is timing-safe via crypto.timingSafeEqual.
 *
 * Returns { valid: false, reason } on any failure so the caller can log
 * a structured audit event without exposing the secret or the full
 * signature.
 */
export function verifyMercadoPagoWebhook(params: VerifyParams): VerifyResult {
  const { signature, requestId, dataId, secret } = params;

  if (!secret) return { valid: false, reason: "missing_secret" };
  if (!signature) return { valid: false, reason: "missing_signature" };
  if (!requestId) return { valid: false, reason: "missing_request_id" };
  if (!dataId) return { valid: false, reason: "missing_data_id" };

  // Parse "ts=<n>,v1=<hex>" — tolerant of whitespace and field order.
  const parts: Record<string, string> = {};
  for (const segment of signature.split(",")) {
    const eq = segment.indexOf("=");
    if (eq <= 0) continue;
    const k = segment.slice(0, eq).trim();
    const v = segment.slice(eq + 1).trim();
    if (k && v) parts[k] = v;
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return { valid: false, reason: "invalid_signature_format" };

  const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(template)
    .digest("hex");

  // hex/hex comparison must be byte-equal length before timingSafeEqual,
  // otherwise the call itself throws.
  let expectedBuf: Buffer;
  let actualBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expectedHex, "hex");
    actualBuf = Buffer.from(v1, "hex");
  } catch {
    return { valid: false, reason: "hash_mismatch" };
  }
  if (expectedBuf.length === 0 || expectedBuf.length !== actualBuf.length) {
    return { valid: false, reason: "hash_mismatch" };
  }

  const ok = crypto.timingSafeEqual(expectedBuf, actualBuf);
  return ok ? { valid: true } : { valid: false, reason: "hash_mismatch" };
}
