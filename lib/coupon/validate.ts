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
  /**
   * True when the submitted code matched COUPON_CODE, even if the coupon
   * ultimately isn't valid (misconfigured percent, expired). Lets a
   * caller tell "wrong/no code" apart from "right code, broken config"
   * without re-deriving the string comparison itself.
   */
  codeMatched: boolean;
}

export function isCouponConfigured(): boolean {
  return !!process.env.COUPON_CODE;
}

export function validateCoupon(codeInput: string | undefined | null): CouponValidationResult {
  const configuredCode = process.env.COUPON_CODE;
  if (!configuredCode) {
    return { valid: false, discountPercent: 0, reason: "not_configured", codeMatched: false };
  }

  const code = (codeInput ?? "").trim();
  const codeMatched = !!code && code.toLowerCase() === configuredCode.trim().toLowerCase();
  if (!codeMatched) {
    return { valid: false, discountPercent: 0, reason: "not_found", codeMatched: false };
  }

  const validUntil = process.env.COUPON_VALID_UNTIL;
  if (validUntil) {
    // End of day, Brasília time, so the last valid day is fully honored.
    const expiry = new Date(`${validUntil}T23:59:59-03:00`);
    if (!Number.isNaN(expiry.getTime()) && Date.now() > expiry.getTime()) {
      return { valid: false, discountPercent: 0, reason: "expired", codeMatched: true };
    }
  }

  // A matched code with a missing/non-numeric/out-of-range percent must
  // never fall through to "valid" with a 0% discount — that's how a
  // recognized coupon silently charged full price in production.
  const discountPercent = Number(process.env.COUPON_DISCOUNT_PERCENT);
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return { valid: false, discountPercent: 0, reason: "not_configured", codeMatched: true };
  }

  return { valid: true, discountPercent, codeMatched: true };
}

export function computeAmountCents(basePriceCents: number, discountPercent: number): number {
  return Math.round(basePriceCents * (1 - discountPercent / 100));
}

export function couponErrorMessage(reason: CouponValidationResult["reason"]): string {
  return reason === "expired" ? "Cupom expirado." : "Cupom inválido.";
}
