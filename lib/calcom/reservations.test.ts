import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// CALCOM_API_KEY is read into a module-level const at import time (same
// pattern as lib/calcom/bookings.ts and lib/calcom/client.ts) — must be
// stubbed BEFORE this import, not in beforeEach.
vi.stubEnv("CALCOM_API_KEY", "test-key");
const { reserveCalcomSlot, releaseCalcomSlot } = await import("./reservations");

describe("reserveCalcomSlot", () => {
  it("returns success with the reservationUid and reservationUntil on 201", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          status: "success",
          data: { reservationUid: "res-123", reservationUntil: "2026-11-03T13:45:00.000Z" },
        }),
    });

    const result = await reserveCalcomSlot({
      eventTypeId: 6606219,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });

    expect(result).toEqual({
      success: true,
      reservationUid: "res-123",
      reservationUntil: "2026-11-03T13:45:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cal.com/v2/slots/reservations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "cal-api-version": "2024-09-04" }),
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      eventTypeId: 6606219,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDuration: 120,
    });
  });

  it("returns success:false when Cal.com responds with a non-2xx status", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad request" });

    const result = await reserveCalcomSlot({
      eventTypeId: 1,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });

    expect(result.success).toBe(false);
  });

  it("item 2h: marks conflict:true on a real 422 UnprocessableEntityException (slot taken)", async () => {
    // Exact shape confirmed live against the real Cal.com API on 2026-11-06,
    // both for "already reserved by another user" and "already booked".
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () =>
        JSON.stringify({
          status: "error",
          error: {
            code: "UnprocessableEntityException",
            message: "This time slot is already reserved by another user. Please choose a different time.",
          },
        }),
    });

    const result = await reserveCalcomSlot({
      eventTypeId: 1,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });

    expect(result.success).toBe(false);
    expect(result.conflict).toBe(true);
  });

  it("item 2h: does NOT mark conflict:true on an unrelated error (e.g. a 500)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Internal Server Error" });

    const result = await reserveCalcomSlot({
      eventTypeId: 1,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });

    expect(result.success).toBe(false);
    expect(result.conflict).toBeFalsy();
  });

  it("returns success:false (mock_mode) without calling fetch when CALCOM_API_KEY is unset", async () => {
    vi.resetModules();
    vi.stubEnv("CALCOM_API_KEY", "");
    const { reserveCalcomSlot: reserveNoKey } = await import("./reservations");
    const result = await reserveNoKey({
      eventTypeId: 1,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });
    expect(result).toEqual({ success: false, error: "mock_mode" });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.resetModules();
    vi.stubEnv("CALCOM_API_KEY", "test-key");
  });

  it("returns success:false when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await reserveCalcomSlot({
      eventTypeId: 1,
      slotStart: "2026-11-11T16:00:00.000Z",
      reservationDurationMinutes: 120,
    });
    expect(result.success).toBe(false);
  });
});

describe("releaseCalcomSlot", () => {
  it("returns success:true on 200", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const result = await releaseCalcomSlot("res-123");
    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cal.com/v2/slots/reservations/res-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns success:false on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: async () => "not found" });
    const result = await releaseCalcomSlot("res-123");
    expect(result).toEqual({ success: false });
  });
});
