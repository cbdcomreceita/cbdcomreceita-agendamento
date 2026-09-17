import { beforeEach, describe, expect, it, vi } from "vitest";

const nextalkPostCreate = vi.fn();

vi.mock("./nextalk-client", () => ({
  nextalkPostCreate: (...a: unknown[]) => nextalkPostCreate(...a),
}));

const { sendConfirmationMessage } = await import("./message");
const { NextalkResponseShapeError } = await import("./nextalk-response");

const input = {
  patientFullName: "Maria Silva",
  dateBR: "12/09/2026",
  timeH: "14h30",
  doctorName: "Dra. Ana",
  meetLink: "https://meet.google.com/abc-defg-hij",
  meetCode: "abc-defg-hij",
};

beforeEach(() => nextalkPostCreate.mockReset());

describe("sendConfirmationMessage", () => {
  it("reads id/status/external_error from a bare object", async () => {
    nextalkPostCreate.mockResolvedValue({ id: 6570, status: "sent", conversation_id: 82 });

    const result = await sendConfirmationMessage(82, input);

    expect(result).toEqual({ id: 6570, status: "sent", external_error: null });
  });

  it("also accepts the response wrapped in `payload`", async () => {
    nextalkPostCreate.mockResolvedValue({ payload: { id: 6570, status: "failed", external_error: "Template not found" } });

    const result = await sendConfirmationMessage(82, input);

    expect(result).toEqual({ id: 6570, status: "failed", external_error: "Template not found" });
  });

  it("throws instead of silently producing an undefined id", async () => {
    nextalkPostCreate.mockResolvedValue({ status: "sent" });

    await expect(sendConfirmationMessage(82, input)).rejects.toThrow(NextalkResponseShapeError);
  });
});
