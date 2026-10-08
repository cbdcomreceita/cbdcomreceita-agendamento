import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logError = vi.fn();
vi.mock("@/lib/audit/log-error", () => ({
  logError: (...a: unknown[]) => logError(...a),
}));

const { validateCoupon, computeAmountCents, isCouponConfigured } = await import("./validate");

const BASE_PRICE_CENTS = 4990;

const ORIGINAL_ENV = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const key of ["COUPONS", "COUPON_CODE", "COUPON_DISCOUNT_PERCENT", "COUPON_VALID_UNTIL"]) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[key] = value;
  }
}

const TWO_COUPONS = JSON.stringify([
  { code: "JOAOVILLA", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
  { code: "CRISOLEU", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
]);

beforeEach(() => {
  logError.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T12:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ORIGINAL_ENV };
});

describe("validateCoupon — COUPONS JSON", () => {
  it("accepts JOAOVILLA at 50% (2495 cents on a 4990 base)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    const result = validateCoupon("JOAOVILLA");
    expect(result.valid).toBe(true);
    expect(computeAmountCents(BASE_PRICE_CENTS, result.discountPercent)).toBe(2495);
  });

  it("accepts CRISOLEU at 50% (2495 cents on a 4990 base)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    const result = validateCoupon("CRISOLEU");
    expect(result.valid).toBe(true);
    expect(computeAmountCents(BASE_PRICE_CENTS, result.discountPercent)).toBe(2495);
  });

  it("matches case-insensitively and trims whitespace", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    const result = validateCoupon("  joaovilla  ");
    expect(result.valid).toBe(true);
    expect(result.code).toBe("JOAOVILLA");
  });

  it("rejects a code that doesn't exist, without revealing anything", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    const result = validateCoupon("NAOEXISTE");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(result.codeMatched).toBe(false);
  });

  it("rejects an expired coupon (now = 2026-11-01T00:00 BRT)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    vi.setSystemTime(new Date("2026-11-01T00:00:00-03:00"));
    const result = validateCoupon("JOAOVILLA");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
    expect(result.codeMatched).toBe(true);
  });

  it("still accepts the coupon at the last second of Oct 31st BRT (23:59:59)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    vi.setSystemTime(new Date("2026-10-31T23:59:59-03:00"));
    const result = validateCoupon("CRISOLEU");
    expect(result.valid).toBe(true);
  });

  it("rejects one second after expiry (2026-11-01T00:00:00 BRT)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    vi.setSystemTime(new Date("2026-11-01T00:00:00-03:00"));
    const result = validateCoupon("CRISOLEU");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });
});

describe("validateCoupon — malformed COUPONS JSON", () => {
  it("fails closed (no active coupon) and logs the error, without throwing", () => {
    setEnv({ COUPONS: "{ this is not valid json" });
    const result = validateCoupon("JOAOVILLA");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_configured");
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "coupon", message: expect.stringContaining("not valid JSON") })
    );
  });

  it("fails closed when COUPONS is valid JSON but not an array", () => {
    setEnv({ COUPONS: JSON.stringify({ code: "JOAOVILLA", percent: 50 }) });
    const result = validateCoupon("JOAOVILLA");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_configured");
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "coupon", message: expect.stringContaining("not an array") })
    );
  });
});

describe("validateCoupon — per-item validation inside COUPONS", () => {
  it("discards an item with an empty code, logs it, and keeps the remaining valid ones", () => {
    setEnv({
      COUPONS: JSON.stringify([
        { code: "", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
        { code: "CRISOLEU", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
      ]),
    });
    const result = validateCoupon("CRISOLEU");
    expect(result.valid).toBe(true);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "coupon", message: expect.stringContaining("Discarding invalid entry") })
    );
  });

  it("discards an item with percent out of range (0 or 101), logs it, and keeps the remaining valid ones", () => {
    setEnv({
      COUPONS: JSON.stringify([
        { code: "QUEBRADO", percent: 0, validUntil: "2026-10-31T23:59:59-03:00" },
        { code: "TAMBEMQUEBRADO", percent: 101, validUntil: "2026-10-31T23:59:59-03:00" },
        { code: "JOAOVILLA", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
      ]),
    });
    expect(validateCoupon("QUEBRADO").valid).toBe(false);
    expect(validateCoupon("QUEBRADO").reason).toBe("not_found"); // discarded entirely, never matches
    expect(validateCoupon("TAMBEMQUEBRADO").valid).toBe(false);
    expect(validateCoupon("JOAOVILLA").valid).toBe(true);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "coupon", message: expect.stringContaining("Discarding invalid entry") })
    );
  });

  it("discards an item whose validUntil doesn't parse into a valid date, logs it, and keeps the remaining valid ones", () => {
    setEnv({
      COUPONS: JSON.stringify([
        { code: "DATAQUEBRADA", percent: 50, validUntil: "not-a-date" },
        { code: "JOAOVILLA", percent: 50, validUntil: "2026-10-31T23:59:59-03:00" },
      ]),
    });
    expect(validateCoupon("DATAQUEBRADA").valid).toBe(false);
    expect(validateCoupon("DATAQUEBRADA").reason).toBe("not_found");
    expect(validateCoupon("JOAOVILLA").valid).toBe(true);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "coupon", message: expect.stringContaining("Discarding invalid entry") })
    );
  });
});

describe("validateCoupon — fallback to legacy env vars when COUPONS is unset", () => {
  it("validates against COUPON_CODE/COUPON_DISCOUNT_PERCENT/COUPON_VALID_UNTIL", () => {
    setEnv({
      COUPON_CODE: "PROMO10",
      COUPON_DISCOUNT_PERCENT: "50",
      COUPON_VALID_UNTIL: "2026-10-31",
    });
    const result = validateCoupon("promo10");
    expect(result.valid).toBe(true);
    expect(computeAmountCents(BASE_PRICE_CENTS, result.discountPercent)).toBe(2495);
  });

  it("treats a missing COUPON_CODE as no coupon configured", () => {
    setEnv({});
    const result = validateCoupon("ANYTHING");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_configured");
  });
});

describe("isCouponConfigured", () => {
  it("is true when at least one coupon is still valid today", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    expect(isCouponConfigured()).toBe(true);
  });

  it("is false once every configured coupon has expired (after Oct 31st)", () => {
    setEnv({ COUPONS: TWO_COUPONS });
    vi.setSystemTime(new Date("2026-11-01T00:00:00-03:00"));
    expect(isCouponConfigured()).toBe(false);
  });

  it("is false when COUPONS is empty/absent and no legacy env vars are set", () => {
    setEnv({});
    expect(isCouponConfigured()).toBe(false);
  });
});
