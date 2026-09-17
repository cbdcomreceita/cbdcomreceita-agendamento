import { beforeEach, describe, expect, it, vi } from "vitest";

const nextalkGet = vi.fn();
const nextalkPostCreate = vi.fn();

vi.mock("./nextalk-client", () => ({
  nextalkGet: (...a: unknown[]) => nextalkGet(...a),
  nextalkPostCreate: (...a: unknown[]) => nextalkPostCreate(...a),
}));

const { findOrCreateConversation } = await import("./conversation");
const { NextalkResponseShapeError } = await import("./nextalk-response");

const ctx = {
  bookingId: "booking-1",
  dateBR: "12/09/2026",
  timeH: "14h30",
  doctorName: "Dra. Ana",
  meetLink: "https://meet.google.com/abc-defg-hij",
};

beforeEach(() => {
  nextalkGet.mockReset();
  nextalkPostCreate.mockReset();
});

describe("findOrCreateConversation — reuse path (the one that already works today)", () => {
  it("reuses the most recent open/pending/snoozed conversation on our inbox and never calls POST /conversations", async () => {
    nextalkGet.mockResolvedValue({
      payload: [{ id: 82, inbox_id: 13, status: "pending", can_reply: true, last_activity_at: 1788902439 }],
    });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result).toEqual({ displayId: 82, createRaw: null });
    expect(nextalkPostCreate).not.toHaveBeenCalled();
  });

  it("skips conversations from a different inbox or with a non-reusable status", async () => {
    nextalkGet.mockResolvedValue({
      payload: [
        { id: 1, inbox_id: 999, status: "open", can_reply: true, last_activity_at: 2 },
        { id: 2, inbox_id: 13, status: "resolved", can_reply: false, last_activity_at: 1 },
        { id: 82, inbox_id: 13, status: "open", can_reply: true, last_activity_at: 0 },
      ],
    });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(82);
  });

  it("still throws if a reusable conversation's own id field were ever invalid (defense in depth — not expected in practice)", async () => {
    nextalkGet.mockResolvedValue({
      payload: [{ id: "82", inbox_id: 13, status: "open", can_reply: true, last_activity_at: 0 }],
    });

    await expect(findOrCreateConversation(8645, ctx)).rejects.toThrow(NextalkResponseShapeError);
  });
});

describe("findOrCreateConversation — creation path (the one that was broken)", () => {
  it("reads display_id from a bare object, per the PDF's documented shape", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ id: 501, display_id: 83, inbox_id: 13, contact_id: 8645, status: "pending" });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(83);
    expect(result.createRaw).toEqual({ id: 501, display_id: 83, inbox_id: 13, contact_id: 8645, status: "pending" });
  });

  it("also accepts display_id wrapped in `payload` (the shape this actually turned out to need)", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ payload: { id: 501, display_id: 83 } });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(83);
  });

  it("also accepts display_id wrapped in `data`", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ data: { id: 501, display_id: 83 } });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(83);
  });

  it("falls back to `id` when display_id is absent — the confirmed real shape for account 5", async () => {
    // This is the exact original bug scenario: display_id absent, only
    // `id` present. It used to throw; now it must succeed via fallback.
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ id: 501, inbox_id: 13, contact_id: 8645, status: "pending" });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(501);
  });

  it("matches the real production payload captured for account 5 (contact 10144, conversation 265 — 2026-09-16)", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({
      id: 265,
      uuid: "01a70843-7c40-4443-a135-53fdde7fa6d2",
      inbox_id: 13,
      contact_id: 10144,
      status: "pending",
    });

    const result = await findOrCreateConversation(10144, ctx);

    expect(result.displayId).toBe(265);
  });

  it("prefers display_id over id when both are present (the PDF's documented shape, for any account that does return it)", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ id: 501, display_id: 83, inbox_id: 13, contact_id: 8645, status: "pending" });

    const result = await findOrCreateConversation(8645, ctx);

    expect(result.displayId).toBe(83);
  });

  it("throws instead of returning undefined/NaN when neither display_id nor id is present anywhere", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ inbox_id: 13, contact_id: 8645, status: "pending" });

    await expect(findOrCreateConversation(8645, ctx)).rejects.toThrow(NextalkResponseShapeError);
  });

  it("includes the numeric fields actually present in the error, for fast diagnosis", async () => {
    nextalkGet.mockResolvedValue({ payload: [] });
    nextalkPostCreate.mockResolvedValue({ inbox_id: 13, contact_id: 8645 });

    await expect(findOrCreateConversation(8645, ctx)).rejects.toThrow(/inbox_id=13/);
  });

  it("throws (does not fall through to `id` or `payload`) when display_id is present but non-numeric at the bare level", async () => {
    nextalkPostCreate.mockResolvedValue({ display_id: "83", id: 501, payload: { display_id: 83 } });
    nextalkGet.mockResolvedValue({ payload: [] });

    await expect(findOrCreateConversation(8645, ctx)).rejects.toThrow(NextalkResponseShapeError);
  });
});
