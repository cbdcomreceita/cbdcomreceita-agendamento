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
// pattern as lib/calcom/reservations.ts) — must be stubbed BEFORE import.
vi.stubEnv("CALCOM_API_KEY", "test-key");
const { createCalcomBooking } = await import("./bookings");

function baseInput() {
  return {
    eventTypeId: 1,
    scheduledAt: "2026-11-13T23:00:00.000Z",
    patientName: "Maria Silva",
    patientEmail: "maria@example.com",
    doctorName: "Dr. Brendon",
    notes: "",
  };
}

describe("createCalcomBooking — item 2h: distinguishing a real conflict from any other failure", () => {
  it("marks conflict:true on a real 409 ConflictException (slot already booked)", async () => {
    // Exact shape confirmed live against the real Cal.com API on 2026-11-06.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          status: "error",
          error: {
            code: "ConflictException",
            message: "User either already has booking at this time or is not available",
          },
        }),
    });

    const result = await createCalcomBooking(baseInput());

    expect(result.success).toBe(false);
    expect(result.conflict).toBe(true);
  });

  it("does NOT mark conflict:true on an unrelated error (e.g. a 500)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Internal Server Error" });

    const result = await createCalcomBooking(baseInput());

    expect(result.success).toBe(false);
    expect(result.conflict).toBeFalsy();
  });

  it("still succeeds normally when Cal.com accepts the booking", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ status: "success", data: { id: 1, uid: "uid-1", location: "https://meet.example.com/x" } }),
    });

    const result = await createCalcomBooking(baseInput());

    expect(result.success).toBe(true);
    expect(result.conflict).toBeUndefined();
  });
});
