import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const tryCheckRateLimit = vi.fn(async (..._args: unknown[]) => ({ ok: true }) as { ok: boolean; limit?: number; remaining?: number; reset?: number });
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { intake: {} },
  tryCheckRateLimit: (...a: unknown[]) => tryCheckRateLimit(...a),
  getClientIp: () => "1.2.3.4",
  maskIp: (ip: string) => ip,
}));

const TOKEN = "Gy1vzkdKZT4lXKfesBpTNwHm35_cLp2B";
const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    scheduled_at: FUTURE,
    scheduled_end_at: null,
    intake_required: true,
    intake_completed_at: null,
    triage_data: { isMinor: false },
    patients: { full_name: "Lais Teste", cpf: "41145285805" },
    doctors: { name: "Dra. Carolina Lopes" },
    ...overrides,
  };
}

let currentRow: unknown;

function makeSupabaseMock(row: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  return { from: vi.fn(() => chain) };
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(currentRow),
}));

const { getIntakeByToken } = await import("./get-intake-by-token");

describe("getIntakeByToken", () => {
  it("resolves a pure token", async () => {
    currentRow = bookingRow();
    const result = await getIntakeByToken(TOKEN);
    expect(result.found).toBe(true);
    expect(result.alreadyCompleted).toBe(false);
    expect(result.patientName).toBe("Lais Teste");
    expect(result.isMinor).toBe(false);
    expect(result.responsibleFullName).toBe("Lais Teste");
    expect(result.responsibleCpf).toBe("41145285805");
  });

  it("surfaces isMinor:true from the booking's triage data", async () => {
    currentRow = bookingRow({ triage_data: { isMinor: true } });
    const result = await getIntakeByToken(TOKEN);
    expect(result.isMinor).toBe(true);
  });

  it("resolves a {{1}}-prefixed token", async () => {
    currentRow = bookingRow();
    const result = await getIntakeByToken(`{{1}}${TOKEN}`);
    expect(result.found).toBe(true);
  });

  it("resolves a %7B%7B1%7D%7D-prefixed token", async () => {
    currentRow = bookingRow();
    const result = await getIntakeByToken(`%7B%7B1%7D%7D${TOKEN}`);
    expect(result.found).toBe(true);
  });

  it("returns found:false for an unknown token", async () => {
    currentRow = null;
    const result = await getIntakeByToken("does-not-exist");
    expect(result.found).toBe(false);
  });

  it("returns alreadyCompleted without exposing data when intake_completed_at is set", async () => {
    currentRow = bookingRow({ intake_completed_at: new Date().toISOString() });
    const result = await getIntakeByToken(TOKEN);
    expect(result.found).toBe(true);
    expect(result.alreadyCompleted).toBe(true);
    expect(result.patientName).toBeUndefined();
  });

  it("returns expired:true once the consultation's end time has passed", async () => {
    currentRow = bookingRow({ scheduled_at: PAST });
    const result = await getIntakeByToken(TOKEN);
    expect(result.found).toBe(true);
    expect(result.expired).toBe(true);
    expect(result.patientName).toBeUndefined();
  });

  it("returns found:false when rate limited", async () => {
    tryCheckRateLimit.mockResolvedValueOnce({ ok: false, limit: 20, remaining: 0, reset: Date.now() });
    currentRow = bookingRow();
    const result = await getIntakeByToken(TOKEN);
    expect(result.found).toBe(false);
  });
});
