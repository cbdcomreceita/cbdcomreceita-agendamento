import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const TOKEN = "Gy1vzkdKZT4lXKfesBpTNwHm35_cLp2B";

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending",
    mp_payment_id: 123,
    mp_qr_code: "qr-code",
    mp_qr_code_base64: "qr-base64",
    expires_at: "2026-11-03T20:00:00.000Z",
    amount_cents: 4990,
    coupon_code: null,
    bookings: {
      id: "booking-1",
      scheduled_at: "2026-11-08T14:30:00.000Z",
      status: "awaiting_payment",
      meet_link: null,
      patients: { full_name: "Lais Teste" },
      doctors: { name: "Dra. Carolina Lopes", crm: "12345", crm_uf: "SP" },
    },
    ...overrides,
  };
}

let lastEqArgs: unknown[] = [];

function makeSupabaseMock(row: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((...args: unknown[]) => {
      lastEqArgs = args;
      return chain;
    }),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  return { from: vi.fn(() => chain) };
}

let currentRow: unknown;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(currentRow),
}));

const { getPaymentByToken } = await import("./get-payment-by-token");

describe("getPaymentByToken", () => {
  it("resolves a pure token", async () => {
    currentRow = paymentRow();
    const result = await getPaymentByToken(TOKEN);
    expect(result.found).toBe(true);
    expect(result.bookingId).toBe("booking-1");
    expect(lastEqArgs).toEqual(["payment_token", TOKEN]);
  });

  it("resolves a {{1}}-prefixed token (decoded button URL) to the same payment", async () => {
    currentRow = paymentRow();
    const result = await getPaymentByToken(`{{1}}${TOKEN}`);
    expect(result.found).toBe(true);
    expect(result.bookingId).toBe("booking-1");
    expect(lastEqArgs).toEqual(["payment_token", TOKEN]);
  });

  it("resolves a %7B%7B1%7D%7D-prefixed token (encoded button URL) to the same payment", async () => {
    currentRow = paymentRow();
    const result = await getPaymentByToken(`%7B%7B1%7D%7D${TOKEN}`);
    expect(result.found).toBe(true);
    expect(result.bookingId).toBe("booking-1");
    expect(lastEqArgs).toEqual(["payment_token", TOKEN]);
  });

  it("returns found: false for an unknown token", async () => {
    currentRow = null;
    const result = await getPaymentByToken("does-not-exist");
    expect(result.found).toBe(false);
  });
});
