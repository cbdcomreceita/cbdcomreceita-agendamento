import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({ from: () => ({ insert: async () => ({}) }) }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { slots: {} },
  tryCheckRateLimit: async () => ({ ok: true }),
  getClientIp: () => "1.2.3.4",
  maskIp: (ip: string) => ip,
  redis: { get: async () => null, set: async () => undefined },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  // availability.ts reads CALCOM_API_KEY per-call (not a module-level
  // const), so it must be re-stubbed every test.
  vi.stubEnv("CALCOM_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const { getAvailableSlots } = await import("./availability");

describe("getAvailableSlots — America/Sao_Paulo is the single timezone used to bucket Cal.com's response", () => {
  it("sends timeZone=America/Sao_Paulo so Cal.com buckets dates by BRT, not UTC", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: {} }),
    });

    await getAvailableSlots(123, 30, 10);

    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl.searchParams.get("timeZone")).toBe("America/Sao_Paulo");
  });

  it("passes the date key straight through unmodified — only Cal.com's own bucketing (via timeZone) decides it", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          "2026-11-09": [{ start: "2026-11-09T23:00:00.000Z" }], // Mon 20h BRT
        },
      }),
    });

    const result = await getAvailableSlots(123, 30, 10);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-11-09");
    expect(result[0].slots[0].time).toBe("2026-11-09T23:00:00.000Z");
  });
});
