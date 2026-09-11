import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfirmationMode = vi.fn();
const checkWhatsappReadiness = vi.fn();
const publishSendConfirmation = vi.fn();
const sendWhatsappAlert = vi.fn();
const dispatchPostPaymentSideEffects = vi.fn();
const logError = vi.fn();

vi.mock("@/lib/whatsapp/config", () => ({
  getConfirmationMode: (...a: unknown[]) => getConfirmationMode(...a),
  checkWhatsappReadiness: (...a: unknown[]) => checkWhatsappReadiness(...a),
}));
vi.mock("@/lib/whatsapp/qstash", () => ({
  publishSendConfirmation: (...a: unknown[]) => publishSendConfirmation(...a),
}));
vi.mock("@/lib/resend/send-whatsapp-alert", () => ({
  sendWhatsappAlert: (...a: unknown[]) => sendWhatsappAlert(...a),
}));
vi.mock("@/lib/post-payment/dispatch", () => ({
  dispatchPostPaymentSideEffects: (...a: unknown[]) => dispatchPostPaymentSideEffects(...a),
}));
vi.mock("@/lib/audit/log-error", () => ({ logError: (...a: unknown[]) => logError(...a) }));
vi.mock("@/lib/resend/send-confirmation", () => ({
  sendBookingConfirmation: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/calcom/bookings", () => ({ createCalcomBooking: vi.fn() }));
vi.mock("@/lib/mercadopago/client", () => ({ getMpPayment: vi.fn() }));
vi.mock("@/lib/analytics/meta-conversions-api", () => ({
  sendMetaConversionEvent: vi.fn().mockResolvedValue(undefined),
}));

function makeSupabaseMock(bookingRow: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: bookingRow, error: null })),
    update: vi.fn(() => chain),
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  return { from: vi.fn(() => chain) };
}

let currentBookingRow: Record<string, unknown>;

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(currentBookingRow),
}));

const { confirmBooking } = await import("./confirm-booking");

function baseBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    status: "pending_payment",
    scheduled_at: "2026-09-12T14:30:00.000Z",
    triage_data: {},
    meet_link: null,
    doctors: {
      id: "doctor-1",
      name: "Dra. Ana Costa",
      email: "ana@example.com",
      crm: "12345",
      crm_uf: "SP",
      calcom_event_type_id: null, // skip Cal.com branch entirely
    },
    patients: {
      id: "patient-1",
      full_name: "Maria Silva",
      email: "maria@example.com",
      phone: "11999998888",
      cpf: "11111111111",
      rg: "111111111",
      birth_date: "1990-01-01",
      address_street: "Rua X",
      address_number: "1",
      address_complement: null,
      address_district: "Centro",
      address_city: "São Paulo",
      address_state: "SP",
      address_zipcode: "00000000",
      selected_symptoms: [],
      has_current_medication: false,
      current_medications: null,
      prior_cbd_use: null,
      lgpd_consent_at: "2026-09-01T00:00:00.000Z",
      terms_consent_at: "2026-09-01T00:00:00.000Z",
    },
    payments: [{ id: "payment-1", mp_payment_id: null, amount_cents: 4990, coupon_code: null }],
    ...overrides,
  };
}

beforeEach(() => {
  getConfirmationMode.mockReset();
  checkWhatsappReadiness.mockReset();
  publishSendConfirmation.mockReset();
  sendWhatsappAlert.mockReset();
  dispatchPostPaymentSideEffects.mockReset();
  logError.mockReset();
  dispatchPostPaymentSideEffects.mockResolvedValue(undefined);
  getConfirmationMode.mockReturnValue("off");
  currentBookingRow = baseBookingRow();
});

describe("confirmBooking — dispatchPostPaymentSideEffects failure isolation", () => {
  it("alerts the team (reason: dispatch_failed) but still returns success:true — the patient must see the booking as confirmed", async () => {
    dispatchPostPaymentSideEffects.mockRejectedValueOnce(new Error("Sheets API down"));

    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(true);
    expect(sendWhatsappAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "dispatch_failed",
        bookingId: "booking-1",
        patientName: "Maria Silva",
        doctorName: "Dra. Ana Costa",
        detail: expect.stringContaining("Conferir manualmente"),
      })
    );
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "confirm", message: "dispatchPostPaymentSideEffects threw" })
    );
  });

  it("does not alert when dispatch succeeds", async () => {
    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(true);
    expect(sendWhatsappAlert).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: "dispatch_failed" })
    );
  });
});

describe("confirmBooking — WhatsApp confirmation mode off", () => {
  it("never checks readiness, never publishes, never alerts about WhatsApp config", async () => {
    getConfirmationMode.mockReturnValue("off");
    checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] }); // should be irrelevant

    await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(checkWhatsappReadiness).not.toHaveBeenCalled();
    expect(publishSendConfirmation).not.toHaveBeenCalled();
    expect(sendWhatsappAlert).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: "config_missing" })
    );
    expect(sendWhatsappAlert).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: "qstash_publish_failed" })
    );
  });
});

describe("confirmBooking — WhatsApp mode on but misconfigured", () => {
  it("logs and alerts (reason: config_missing) instead of silently skipping, and never calls publishSendConfirmation", async () => {
    getConfirmationMode.mockReturnValue("team_only");
    checkWhatsappReadiness.mockReturnValue({ ready: false, missing: ["NEXTALK_API_TOKEN", "QSTASH_URL"] });

    await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(publishSendConfirmation).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "whatsapp",
        metadata: expect.objectContaining({ missing: ["NEXTALK_API_TOKEN", "QSTASH_URL"] }),
      })
    );
    expect(sendWhatsappAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "config_missing",
        detail: expect.stringContaining("NEXTALK_API_TOKEN, QSTASH_URL"),
      })
    );
  });
});

describe("confirmBooking — QStash publish failure", () => {
  it("logs and alerts (reason: qstash_publish_failed) when everything is configured but publishing throws", async () => {
    getConfirmationMode.mockReturnValue("all");
    checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] });
    publishSendConfirmation.mockRejectedValueOnce(new Error("QStash 500"));

    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(true); // isolation: still succeeds overall
    expect(sendWhatsappAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "qstash_publish_failed",
        detail: expect.stringContaining("QStash 500"),
      })
    );
  });

  it("does not alert when publishing succeeds", async () => {
    getConfirmationMode.mockReturnValue("all");
    checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] });
    publishSendConfirmation.mockResolvedValueOnce(undefined);

    await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(publishSendConfirmation).toHaveBeenCalledWith("booking-1");
    expect(sendWhatsappAlert).not.toHaveBeenCalled();
  });
});
