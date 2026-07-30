/**
 * Single-code campaign coupon, defined entirely via server-only env vars
 * (COUPON_CODE / COUPON_DISCOUNT_PERCENT / COUPON_VALID_UNTIL — no
 * NEXT_PUBLIC_ prefix, so the code never reaches the client bundle).
 * No usage cap, only an expiry date. Deliberately not a DB table: one
 * code, no per-use tracking needed.
 */

export interface CouponValidationResult {
  valid: boolean;
  /** 0 when invalid. */
  discountPercent: number;
  reason?: "not_configured" | "expired" | "not_found";
}

export function isCouponConfigured(): boolean {
  return !!process.env.COUPON_CODE;
}

export function validateCoupon(codeInput: string | undefined | null): CouponValidationResult {
  const configuredCode = process.env.COUPON_CODE;
  if (!configuredCode) {
    return { valid: false, discountPercent: 0, reason: "not_configured" };
  }

  const code = (codeInput ?? "").trim();
  if (!code || code.toLowerCase() !== configuredCode.trim().toLowerCase()) {
    return { valid: false, discountPercent: 0, reason: "not_found" };
  }

  const validUntil = process.env.COUPON_VALID_UNTIL;
  if (validUntil) {
    // End of day, Brasília time, so the last valid day is fully honored.
    const expiry = new Date(`${validUntil}T23:59:59-03:00`);
    if (!Number.isNaN(expiry.getTime()) && Date.now() > expiry.getTime()) {
      return { valid: false, discountPercent: 0, reason: "expired" };
    }
  }

  const discountPercent = Number(process.env.COUPON_DISCOUNT_PERCENT ?? "0");
  return {
    valid: true,
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
  };
}

export function computeAmountCents(basePriceCents: number, discountPercent: number): number {
  return Math.round(basePriceCents * (1 - discountPercent / 100));
}

export function couponErrorMessage(reason: CouponValidationResult["reason"]): string {
  return reason === "expired" ? "Cupom expirado." : "Cupom inválido.";
}
