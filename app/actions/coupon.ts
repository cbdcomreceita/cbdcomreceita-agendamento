"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import {
  rateLimiters,
  tryCheckRateLimit,
  getClientIp,
  maskIp,
} from "@/lib/rate-limit";
import {
  isCouponConfigured,
  validateCoupon,
  computeAmountCents,
  couponErrorMessage,
} from "@/lib/coupon/validate";

const BASE_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_CONSULTATION_PRICE ?? "4990");

/** Whether to render the coupon field at all — never exposes the code itself. */
export async function isCouponAvailable(): Promise<boolean> {
  return isCouponConfigured();
}

export interface CouponCheckResult {
  valid: boolean;
  discountPercent: number;
  amountCents: number;
  basePriceCents: number;
  code?: string;
  message?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * Instant coupon check for /dados. Runs entirely server-side against
 * COUPONS — the client only ever gets back a valid/invalid verdict and
 * the resulting price, never the code list itself. Rate-limited
 * separately from generatePix so trial-and-error here doesn't share a
 * budget with real PIX generation.
 */
export async function validateCouponAction(codeInput: string): Promise<CouponCheckResult> {
  const supabase = createServiceClient();
  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);

  const rl = await tryCheckRateLimit(rateLimiters.validateCoupon, ip);
  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    await supabase.from("audit_events").insert({
      event_type: "rate_limit_exceeded",
      entity_type: "rate_limit",
      metadata: {
        endpoint: "validate-coupon",
        ip: maskIp(ip),
        limit: rl.limit,
        retryAfter: retryAfterSec,
      },
    });
    return {
      valid: false,
      discountPercent: 0,
      amountCents: BASE_PRICE_CENTS,
      basePriceCents: BASE_PRICE_CENTS,
      rateLimited: true,
      retryAfter: retryAfterSec,
    };
  }

  const result = validateCoupon(codeInput);
  const amountCents = computeAmountCents(BASE_PRICE_CENTS, result.discountPercent);

  await supabase.from("audit_events").insert({
    event_type: result.valid ? "coupon_applied" : "coupon_rejected",
    entity_type: "coupon",
    metadata: result.valid
      ? { code: result.code, discountPercent: result.discountPercent }
      : { code: codeInput.trim().toUpperCase(), reason: result.reason ?? "not_found" },
  });

  return {
    valid: result.valid,
    discountPercent: result.discountPercent,
    amountCents,
    basePriceCents: BASE_PRICE_CENTS,
    code: result.code,
    message: result.valid ? undefined : couponErrorMessage(result.reason),
  };
}
