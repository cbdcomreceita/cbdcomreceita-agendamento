import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({ from: () => ({ insert: async () => ({}) }) }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { slots: {} },
  tryCheckRateLimit: async () => ({ ok: true }),
  getClientIp: () => "1.2.3.4",
  maskIp: (ip: string) => ip,
  // Always a cache miss — forces every test through the real fetch path.
  redis: { get: async () => null, set: async () => undefined },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  // availability.ts reads CALCOM_API_KEY per-call (not a module-level
  // const like reservations.ts), so it must be re-stubbed every test.
  vi.stubEnv("CALCOM_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const { getAvailableSlots } = await import("./availability");
const { MIN_LEAD_HOURS } = await import("./config");

describe("getAvailableSlots — MIN_LEAD_HOURS filtering (item 2c: nada com menos de 24h)", () => {
  it("drops slots inside the lead-time window and keeps slots past it", async () => {
    const tooSoon = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h out — inside the 24h window
    const farEnough = new Date(Date.now() + (MIN_LEAD_HOURS + 1) * 60 * 60 * 1000); // 25h out

    const dateKey = (d: Date) => d.toISOString().slice(0, 10);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          [dateKey(tooSoon)]: [{ start: tooSoon.toISOString() }],
          [dateKey(farEnough)]: [{ start: farEnough.toISOString() }],
        },
      }),
    });

    const result = await getAvailableSlots(123, 30, 10);

    const allTimes = result.flatMap((d) => d.slots.map((s) => s.time));
    expect(allTimes).not.toContain(tooSoon.toISOString());
    expect(allTimes).toContain(farEnough.toISOString());
  });

  it("sends a `start` query param already offset by MIN_LEAD_HOURS", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: {} }),
    });

    const before = Date.now();
    await getAvailableSlots(123, 30, 10);

    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));
    const startParam = new Date(calledUrl.searchParams.get("start")!).getTime();
    const minExpected = before + MIN_LEAD_HOURS * 60 * 60 * 1000 - 5000; // 5s slack for test execution time
    expect(startParam).toBeGreaterThanOrEqual(minExpected);
  });

  it("item 0: sends timeZone=America/Sao_Paulo so Cal.com buckets dates by BRT, not UTC", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: {} }),
    });

    await getAvailableSlots(123, 30, 10);

    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl.searchParams.get("timeZone")).toBe("America/Sao_Paulo");
  });

  it("drops a day entirely when every one of its slots falls inside the lead-time window", async () => {
    const tooSoon = new Date(Date.now() + 1 * 60 * 60 * 1000);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: { [tooSoon.toISOString().slice(0, 10)]: [{ start: tooSoon.toISOString() }] },
      }),
    });

    const result = await getAvailableSlots(123, 30, 10);
    expect(result).toEqual([]);
  });
});
