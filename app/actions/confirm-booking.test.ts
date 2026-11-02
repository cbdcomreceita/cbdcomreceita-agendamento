import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfirmationMode = vi.fn();
const checkWhatsappReadiness = vi.fn();
const getDispatchMode = vi.fn();
const publishSendConfirmation = vi.fn();
const orchestrateConfirmation = vi.fn();
const sendWhatsappAlert = vi.fn();
const dispatchPostPaymentSideEffects = vi.fn();
const logError = vi.fn();

vi.mock("@/lib/whatsapp/config", () => ({
  getConfirmationMode: (...a: unknown[]) => getConfirmationMode(...a),
  checkWhatsappReadiness: (...a: unknown[]) => checkWhatsappReadiness(...a),
  getDispatchMode: (...a: unknown[]) => getDispatchMode(...a),
  INLINE_DISPATCH_TIMEOUT_MS: 20000,
}));
vi.mock("@/lib/whatsapp/qstash", () => ({
  publishSendConfirmation: (...a: unknown[]) => publishSendConfirmation(...a),
}));
vi.mock("@/lib/whatsapp/orchestrate-confirmation", () => ({
  orchestrateConfirmation: (...a: unknown[]) => orchestrateConfirmation(...a),
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
const sendPaymentAfterExpiryAlert = vi.fn();
vi.mock("@/lib/resend/send-payment-after-expiry-alert", () => ({
  sendPaymentAfterExpiryAlert: (...a: unknown[]) => sendPaymentAfterExpiryAlert(...a),
}));

// Three different call sites share .maybeSingle() in confirm-booking.ts:
// the step-3b conflict check (only for status='expired'), the step-5
// atomic claim, and the step-5 "lost race" meetLink re-fetch. Each test
// queues the responses it needs, in call order; an empty queue defaults to
// "claim succeeds / no conflict found" — the right default for the plain
// (non-expired) tests, which only ever hit the claim call once.
let maybeSingleQueue: Array<{ data: unknown; error: unknown }>;

function makeSupabaseMock(bookingRow: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: bookingRow, error: null })),
    maybeSingle: vi.fn(async () => maybeSingleQueue.shift() ?? { data: { id: "booking-1" }, error: null }),
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
  getDispatchMode.mockReset();
  publishSendConfirmation.mockReset();
  orchestrateConfirmation.mockReset();
  sendWhatsappAlert.mockReset();
  dispatchPostPaymentSideEffects.mockReset();
  logError.mockReset();
  sendPaymentAfterExpiryAlert.mockReset();
  dispatchPostPaymentSideEffects.mockResolvedValue(undefined);
  getConfirmationMode.mockReturnValue("off");
  getDispatchMode.mockReturnValue("qstash");
  currentBookingRow = baseBookingRow();
  maybeSingleQueue = [];
});

describe("confirmBooking — late approval after the funnel cron marked the booking expired", () => {
  it("confirms normally when no other booking has already taken the slot", async () => {
    currentBookingRow = baseBookingRow({ status: "expired" });
    // 1st maybeSingle: conflict check -> none. 2nd: atomic claim -> succeeds.
    maybeSingleQueue = [{ data: null, error: null }, { data: { id: "booking-1" }, error: null }];

    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(true);
    expect(sendPaymentAfterExpiryAlert).not.toHaveBeenCalled();
  });

  it("refuses to auto-confirm, records the payment as approved, and alerts the team when the slot was already taken", async () => {
    currentBookingRow = baseBookingRow({ status: "expired" });
    maybeSingleQueue = [{ data: { id: "booking-2" }, error: null }];

    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("payment_after_expiry_slot_taken");
    expect(sendPaymentAfterExpiryAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        conflictingBookingId: "booking-2",
        patientName: "Maria Silva",
        doctorName: "Dra. Ana Costa",
      })
    );
    // dispatchPostPaymentSideEffects (Cal.com, e-mails, Sheets) must never
    // run for the conflicting path — the appointment was never confirmed.
    expect(dispatchPostPaymentSideEffects).not.toHaveBeenCalled();
  });
});

describe("confirmBooking — concurrent calls race for the same booking", () => {
  it("only one of two simultaneous invocations runs side effects; the other reports alreadyProcessed", async () => {
    // Reproduces the 2026-11-02 production incident: the client's polling
    // tick and Mercado Pago's webhook both called confirmBooking for the
    // same booking within ~1.5s of each other, both passed the (then
    // read-only) idempotency check, and both ran Cal.com/e-mails/Sheets.
    //
    // The shared mock queue below stands in for Postgres's real guarantee:
    // of two concurrent `UPDATE ... WHERE status IN (...) RETURNING id`
    // statements on the same row, exactly one matches and returns a row —
    // never both, regardless of which fired first. Order here is
    // deliberately not asserted; only the count is.
    maybeSingleQueue = [
      { data: { id: "booking-1" }, error: null }, // first to reach the claim wins
      { data: null, error: null }, // second finds it already 'confirmed'
      { data: { meet_link: "https://meet.google.com/won-the-race" }, error: null }, // its meetLink re-fetch
    ];

    const [first, second] = await Promise.all([
      confirmBooking({ bookingId: "booking-1", source: "polling" }),
      confirmBooking({ bookingId: "booking-1", source: "webhook" }),
    ]);

    const results = [first, second];
    const winners = results.filter((r) => !r.alreadyProcessed);
    const losers = results.filter((r) => r.alreadyProcessed);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(winners[0].success).toBe(true);
    expect(losers[0]).toMatchObject({ success: true, alreadyProcessed: true });
    expect(losers[0].meetLink).toBe("https://meet.google.com/won-the-race");

    // The one side effect that has no collision-detection of its own
    // (Cal.com's own DB did the detecting there) — must run exactly once.
    expect(dispatchPostPaymentSideEffects).toHaveBeenCalledTimes(1);
  });
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

describe("confirmBooking — WhatsApp inline dispatch", () => {
  it("calls orchestrateConfirmation directly and never touches QStash", async () => {
    getConfirmationMode.mockReturnValue("all");
    getDispatchMode.mockReturnValue("inline");
    checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] });
    orchestrateConfirmation.mockResolvedValueOnce(undefined);

    const result = await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(result.success).toBe(true);
    expect(orchestrateConfirmation).toHaveBeenCalledWith("booking-1");
    expect(publishSendConfirmation).not.toHaveBeenCalled();
    expect(sendWhatsappAlert).not.toHaveBeenCalled();
  });

  it("does not alert when orchestrateConfirmation itself handles a failure internally (it never throws)", async () => {
    getConfirmationMode.mockReturnValue("all");
    getDispatchMode.mockReturnValue("inline");
    checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] });
    // orchestrateConfirmation's contract is to never throw, even when the
    // send itself failed — it alerts internally with its own specific reason.
    orchestrateConfirmation.mockResolvedValueOnce(undefined);

    await confirmBooking({ bookingId: "booking-1", source: "webhook" });

    expect(sendWhatsappAlert).not.toHaveBeenCalled();
  });

  it("gives up and alerts (reason: send_failed) if orchestrateConfirmation is still running past the timeout, without failing confirmBooking", async () => {
    vi.useFakeTimers();
    try {
      getConfirmationMode.mockReturnValue("all");
      getDispatchMode.mockReturnValue("inline");
      checkWhatsappReadiness.mockReturnValue({ ready: true, missing: [] });
      // Never resolves within the test — simulates a stuck NexTalk call.
      orchestrateConfirmation.mockReturnValueOnce(new Promise(() => {}));

      const resultPromise = confirmBooking({ bookingId: "booking-1", source: "webhook" });
      await vi.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(result.success).toBe(true); // confirmBooking's own return is unaffected
      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "whatsapp",
          message: "Inline WhatsApp dispatch exceeded the timeout",
        })
      );
      expect(sendWhatsappAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "send_failed",
          detail: expect.stringContaining("20s"),
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
