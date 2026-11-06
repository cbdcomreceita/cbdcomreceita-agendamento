import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { generatePix: {} },
  tryCheckRateLimit: async () => ({ ok: true }),
  getClientIp: () => "1.2.3.4",
  maskIp: (ip: string) => ip,
}));
vi.mock("@/lib/coupon/validate", () => ({
  validateCoupon: () => ({ valid: false, code: null, discountPercent: 0, reason: "no_code" }),
  computeAmountCents: (base: number) => base,
  couponErrorMessage: () => undefined,
}));
vi.mock("@/lib/pix/config", () => ({ getPixExpirationMinutes: () => 120 }));

const isAgenda3NextEnabledMock = vi.fn();
vi.mock("@/app/actions/feature-flags", () => ({
  isAgenda3NextEnabled: (...a: unknown[]) => isAgenda3NextEnabledMock(...a),
}));

const isMpConfiguredMock = vi.fn();
const createMpPaymentMock = vi.fn();
vi.mock("@/lib/mercadopago/client", () => ({
  isMpConfigured: (...a: unknown[]) => isMpConfiguredMock(...a),
  createMpPayment: (...a: unknown[]) => createMpPaymentMock(...a),
}));

const reserveCalcomSlotMock = vi.fn();
vi.mock("@/lib/calcom/reservations", () => ({
  reserveCalcomSlot: (...a: unknown[]) => reserveCalcomSlotMock(...a),
}));

let bookingRow: Record<string, unknown>;
let existingPayment: Record<string, unknown> | null;
const bookingsUpdateSpy = vi.fn();
const auditInsertSpy = vi.fn();

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "bookings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: bookingRow, error: null })),
            })),
          })),
          update: vi.fn((payload: unknown) => ({
            eq: vi.fn(async () => {
              bookingsUpdateSpy(payload);
              return { error: null };
            }),
          })),
        };
      }
      if (table === "payments") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: existingPayment, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: "payment-1" }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { id: "payment-1" }, error: null })),
              })),
            })),
          })),
        };
      }
      if (table === "audit_events") {
        return {
          insert: vi.fn(async (payload: unknown) => {
            auditInsertSpy(payload);
            return { error: null };
          }),
        };
      }
      throw new Error(`unexpected table in test: ${table}`);
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(),
}));

const { generatePix } = await import("./generate-pix");

function baseBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    status: "awaiting_payment",
    scheduled_at: "2026-11-13T23:00:00.000Z",
    patients: { full_name: "Maria Silva", email: "maria@example.com", cpf: "11111111111" },
    doctors: { name: "Dr. Brendon", calcom_event_type_id: 6217774 },
    ...overrides,
  };
}

function mockMpSuccess() {
  isMpConfiguredMock.mockReturnValue(true);
  createMpPaymentMock.mockResolvedValue({
    id: 123456,
    point_of_interaction: {
      transaction_data: {
        qr_code: "pix-code",
        qr_code_base64: "base64data",
        ticket_url: "https://mp.example.com/ticket",
      },
    },
    date_of_expiration: "2026-11-13T15:00:00.000Z",
  });
}

beforeEach(() => {
  bookingRow = baseBookingRow();
  existingPayment = null;
  bookingsUpdateSpy.mockReset();
  auditInsertSpy.mockReset();
  isAgenda3NextEnabledMock.mockReset();
  isAgenda3NextEnabledMock.mockResolvedValue(true);
  isMpConfiguredMock.mockReset();
  createMpPaymentMock.mockReset();
  reserveCalcomSlotMock.mockReset();
  mockMpSuccess();
});

describe("generatePix — item 1 (Entrega 3, item 2h): Cal.com reservation at PIX generation", () => {
  it("a) slot livre: PIX é gerado e a reserva é criada no Cal.com", async () => {
    reserveCalcomSlotMock.mockResolvedValue({
      success: true,
      reservationUid: "res-123",
      reservationUntil: "2026-11-13T21:00:00.000Z",
    });

    const result = await generatePix({ bookingId: "booking-1" });

    expect(result.success).toBe(true);
    expect(result.qrCode).toBe("pix-code");
    expect(result.reservedUntil).toBe("2026-11-13T21:00:00.000Z");
    expect(bookingsUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ calcom_reservation_uid: "res-123" })
    );
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "pix_generated" })
    );
  });

  it("b) horário já reservado por outra pessoa: PIX é bloqueado com a mensagem correta", async () => {
    reserveCalcomSlotMock.mockResolvedValue({
      success: false,
      error: "Cal.com error 422: already reserved",
      conflict: true,
    });

    const result = await generatePix({ bookingId: "booking-1" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("slot_conflict");
    expect(result.qrCode).toBeUndefined();
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "slot_conflict_before_payment", entity_id: "booking-1" })
    );
    // Never claims a reservation that doesn't exist.
    expect(bookingsUpdateSpy).not.toHaveBeenCalled();
    // The doomed PIX must never reach the patient.
    expect(auditInsertSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "pix_generated" })
    );
  });

  it("c) Cal.com fora do ar: PIX é gerado normalmente, sem reserva, e fica auditado", async () => {
    reserveCalcomSlotMock.mockResolvedValue({
      success: false,
      error: "fetch failed: ECONNREFUSED",
      conflict: false,
    });

    const result = await generatePix({ bookingId: "booking-1" });

    expect(result.success).toBe(true);
    expect(result.qrCode).toBe("pix-code");
    expect(result.reservedUntil).toBeUndefined();
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "slot_reservation_skipped_calcom_error" })
    );
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "pix_generated" })
    );
  });

  it("não tenta reservar quando AGENDA_3_NEXT_ENABLED está desligada", async () => {
    isAgenda3NextEnabledMock.mockResolvedValue(false);

    const result = await generatePix({ bookingId: "booking-1" });

    expect(result.success).toBe(true);
    expect(reserveCalcomSlotMock).not.toHaveBeenCalled();
  });
});
