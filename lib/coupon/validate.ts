/**
 * Coupon list, defined entirely via server-only env vars (no NEXT_PUBLIC_
 * prefix, so codes never reach the client bundle). No usage cap, only an
 * expiry date per code. Deliberately not a DB table: a handful of
 * campaign codes, no per-use tracking needed.
 *
 * Primary source: COUPONS, a JSON array of
 * {"code": string, "percent": number, "validUntil": string}.
 * Falls back to the legacy single-coupon env vars (COUPON_CODE /
 * COUPON_DISCOUNT_PERCENT / COUPON_VALID_UNTIL) when COUPONS is unset,
 * so existing deploys keep working untouched.
 */

import { logError } from "@/lib/audit/log-error";

export interface CouponValidationResult {
  valid: boolean;
  /** 0 when invalid. */
  discountPercent: number;
  reason?: "not_configured" | "expired" | "not_found";
  /**
   * True when the submitted code matched a configured coupon, even if
   * that coupon ultimately isn't valid (e.g. expired). Lets a caller
   * tell "wrong/no code" apart from "right code, but expired" without
   * re-deriving the string comparison itself.
   */
  codeMatched: boolean;
  /** The configured code that matched, present whenever codeMatched is true. */
  code?: string;
}

interface CouponConfig {
  code: string;
  percent: number;
  /** null means no expiry. */
  validUntilMs: number | null;
}

/**
 * A bare date (YYYY-MM-DD) is anchored to end-of-day Brasília time so the
 * last valid day is fully honored. A full ISO datetime (with its own
 * offset, e.g. from the COUPONS JSON) is used as-is.
 */
function parseValidUntil(value: string): number {
  const hasTime = /T\d{2}:\d{2}/.test(value);
  const iso = hasTime ? value : `${value}T23:59:59-03:00`;
  return new Date(iso).getTime();
}

function parseCouponItem(raw: unknown): CouponConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const code = typeof item.code === "string" ? item.code.trim() : "";
  const percent = Number(item.percent);
  const percentValid = Number.isFinite(percent) && percent >= 1 && percent <= 100;

  let validUntilMs: number | null = null;
  const validUntilRaw = item.validUntil;
  if (typeof validUntilRaw === "string" && validUntilRaw.trim()) {
    const parsed = parseValidUntil(validUntilRaw);
    if (Number.isNaN(parsed)) {
      return null;
    }
    validUntilMs = parsed;
  }

  if (!code || !percentValid) {
    return null;
  }

  return { code, percent, validUntilMs };
}

function loadFromJson(raw: string): CouponConfig[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    void logError({
      scope: "coupon",
      message: "COUPONS env var is not valid JSON — treating as no active coupon",
      metadata: { error: String(err) },
    });
    return [];
  }

  if (!Array.isArray(parsed)) {
    void logError({
      scope: "coupon",
      message: "COUPONS env var is valid JSON but not an array — treating as no active coupon",
      metadata: { parsed },
    });
    return [];
  }

  const result: CouponConfig[] = [];
  for (const rawItem of parsed) {
    const item = parseCouponItem(rawItem);
    if (!item) {
      void logError({
        scope: "coupon",
        message: "Discarding invalid entry in COUPONS (bad code/percent/validUntil)",
        metadata: { rawItem },
      });
      continue;
    }
    result.push(item);
  }
  return result;
}

function loadFromLegacyEnvVars(): CouponConfig[] {
  const legacyCode = process.env.COUPON_CODE;
  if (!legacyCode) return [];

  const item = parseCouponItem({
    code: legacyCode,
    percent: process.env.COUPON_DISCOUNT_PERCENT,
    validUntil: process.env.COUPON_VALID_UNTIL,
  });

  if (!item) {
    void logError({
      scope: "coupon",
      message: "Legacy coupon env vars are set but invalid (bad percent/validUntil) — treating as no active coupon",
      metadata: {
        discountPercentRaw: process.env.COUPON_DISCOUNT_PERCENT ?? null,
        validUntilRaw: process.env.COUPON_VALID_UNTIL ?? null,
      },
    });
    return [];
  }

  return [item];
}

function loadCoupons(): CouponConfig[] {
  const raw = process.env.COUPONS;
  if (raw && raw.trim()) {
    return loadFromJson(raw);
  }
  return loadFromLegacyEnvVars();
}

function isExpired(coupon: CouponConfig, nowMs: number): boolean {
  return coupon.validUntilMs !== null && nowMs > coupon.validUntilMs;
}

/** Whether at least one coupon is configured AND still valid right now. */
export function isCouponConfigured(): boolean {
  const now = Date.now();
  return loadCoupons().some((c) => !isExpired(c, now));
}

export function validateCoupon(codeInput: string | undefined | null): CouponValidationResult {
  const coupons = loadCoupons();
  if (coupons.length === 0) {
    return { valid: false, discountPercent: 0, reason: "not_configured", codeMatched: false };
  }

  const code = (codeInput ?? "").trim();
  const match = code
    ? coupons.find((c) => c.code.toLowerCase() === code.toLowerCase())
    : undefined;

  if (!match) {
    return { valid: false, discountPercent: 0, reason: "not_found", codeMatched: false };
  }

  if (isExpired(match, Date.now())) {
    return { valid: false, discountPercent: 0, reason: "expired", codeMatched: true, code: match.code };
  }

  return { valid: true, discountPercent: match.percent, codeMatched: true, code: match.code };
}

export function computeAmountCents(basePriceCents: number, discountPercent: number): number {
  return Math.round(basePriceCents * (1 - discountPercent / 100));
}

export function couponErrorMessage(reason: CouponValidationResult["reason"]): string {
  return reason === "expired" ? "Cupom expirado." : "Cupom inválido.";
}
