import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadBookingContext = vi.fn();
const reserveNotification = vi.fn();
const updateNotificationLog = vi.fn();
const findOrCreateContact = vi.fn();
const publishVerifyDelivery = vi.fn();

vi.mock("./booking-context", () => ({
  loadBookingContext: (...a: unknown[]) => loadBookingContext(...a),
  alertForBooking: vi.fn(),
}));
vi.mock("./notification-log", () => ({
  reserveNotification: (...a: unknown[]) => reserveNotification(...a),
  updateNotificationLog: (...a: unknown[]) => updateNotificationLog(...a),
}));
vi.mock("./contact", () => ({
  findOrCreateContact: (...a: unknown[]) => findOrCreateContact(...a),
  ensureContactInbox: vi.fn(),
}));
vi.mock("./conversation", () => ({ findOrCreateConversation: vi.fn() }));
vi.mock("./message", () => ({ sendConfirmationMessage: vi.fn() }));
vi.mock("./kanban", () => ({ upsertKanbanCard: vi.fn() }));
vi.mock("./qstash", () => ({ publishVerifyDelivery: (...a: unknown[]) => publishVerifyDelivery(...a) }));
vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const { orchestrateConfirmation } = await import("./orchestrate-confirmation");

beforeEach(() => {
  loadBookingContext.mockReset();
  reserveNotification.mockReset();
  updateNotificationLog.mockReset();
  findOrCreateContact.mockReset();
  publishVerifyDelivery.mockReset();
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
