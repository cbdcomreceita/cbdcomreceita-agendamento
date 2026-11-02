import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadBookingContext = vi.fn();
const reserveNotification = vi.fn();
const updateNotificationLog = vi.fn();
const findOrCreateContact = vi.fn();
const ensureContactInbox = vi.fn();
const findOrCreateConversation = vi.fn();
const sendConfirmationMessage = vi.fn();
const upsertKanbanCard = vi.fn();
const publishVerifyDelivery = vi.fn();
const alertForBooking = vi.fn();

vi.mock("./booking-context", () => ({
  loadBookingContext: (...a: unknown[]) => loadBookingContext(...a),
  alertForBooking: (...a: unknown[]) => alertForBooking(...a),
}));
vi.mock("./notification-log", () => ({
  reserveNotification: (...a: unknown[]) => reserveNotification(...a),
  updateNotificationLog: (...a: unknown[]) => updateNotificationLog(...a),
}));
vi.mock("./contact", () => ({
  findOrCreateContact: (...a: unknown[]) => findOrCreateContact(...a),
  ensureContactInbox: (...a: unknown[]) => ensureContactInbox(...a),
}));
vi.mock("./conversation", () => ({
  findOrCreateConversation: (...a: unknown[]) => findOrCreateConversation(...a),
}));
vi.mock("./message", () => ({
  sendConfirmationMessage: (...a: unknown[]) => sendConfirmationMessage(...a),
}));
vi.mock("./kanban", () => ({ upsertKanbanCard: (...a: unknown[]) => upsertKanbanCard(...a) }));
vi.mock("./qstash", () => ({ publishVerifyDelivery: (...a: unknown[]) => publishVerifyDelivery(...a) }));
vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const { orchestrateConfirmation } = await import("./orchestrate-confirmation");

beforeEach(() => {
  loadBookingContext.mockReset();
  reserveNotification.mockReset();
  updateNotificationLog.mockReset();
  findOrCreateContact.mockReset();
  ensureContactInbox.mockReset();
  findOrCreateConversation.mockReset();
  sendConfirmationMessage.mockReset();
  upsertKanbanCard.mockReset();
  publishVerifyDelivery.mockReset();
  alertForBooking.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("orchestrateConfirmation — WHATSAPP_CONFIRMATION_MODE=off", () => {
  it("returns immediately: no booking lookup, no notifications_log write, nothing published", async () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "off");

    await orchestrateConfirmation("booking-123");

    expect(loadBookingContext).not.toHaveBeenCalled();
    expect(reserveNotification).not.toHaveBeenCalled();
    expect(updateNotificationLog).not.toHaveBeenCalled();
    expect(findOrCreateContact).not.toHaveBeenCalled();
    expect(publishVerifyDelivery).not.toHaveBeenCalled();
  });

  it("also short-circuits when the env var is simply unset (defaults to off)", async () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "");

    await orchestrateConfirmation("booking-123");

    expect(loadBookingContext).not.toHaveBeenCalled();
    expect(reserveNotification).not.toHaveBeenCalled();
  });
});

describe("orchestrateConfirmation — E.164 phone (2026-11-02 production incident)", () => {
  // Production's webhook (still on `main`, pre-dating this branch's E.164
  // fix in phone.ts) alerted "invalid_phone" for +5511945916893 during a
  // real Cenário B test. This proves THIS branch's confirmation path
  // normalizes that exact number correctly and never raises that alert —
  // ./phone is NOT mocked in this file, so normalizePhoneToVariants runs
  // for real.
  it("normalizes +5511945916893 to the right dual E.164 variants and never alerts invalid_phone", async () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "all");
    vi.stubEnv("WHATSAPP_DISPATCH_MODE", "inline");

    loadBookingContext.mockResolvedValue({
      bookingId: "booking-123",
      patientId: "patient-1",
      patientFullName: "Lais Teste",
      patientPhone: "+5511945916893",
      patientEmail: "laishara011@gmail.com",
      doctorName: "Dra. Carolina Lopes",
      dateBR: "09/11/2026",
      timeH: "09h30",
      meetLink: "https://meet.google.com/abc-defg-hij",
      amountCents: 4990,
    });
    reserveNotification.mockResolvedValue({
      row: { id: "log-1", nextalk_message_id: null },
      isNew: true,
    });
    findOrCreateContact.mockResolvedValue({ contact: { id: 999 }, createRaw: null });
    findOrCreateConversation.mockResolvedValue({ displayId: 42, createRaw: null });
    sendConfirmationMessage.mockResolvedValue({ id: 1, status: "sent", external_error: null });
    upsertKanbanCard.mockResolvedValue({ cardId: 1, action: "moved" });

    await orchestrateConfirmation("booking-123");

    expect(alertForBooking).not.toHaveBeenCalledWith(
      "invalid_phone",
      expect.anything(),
      expect.anything()
    );
    expect(findOrCreateContact).toHaveBeenCalledWith(
      { primary: "+5511945916893", fallback: "+551145916893" },
      "Lais Teste",
      "laishara011@gmail.com"
    );
  });
});
