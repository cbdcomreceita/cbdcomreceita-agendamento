import { describe, expect, it } from "vitest";
import { formatIntakeDeadline, getIntakeDeadline } from "./deadline";

describe("getIntakeDeadline", () => {
  it("is exactly 2 hours before scheduled_at", () => {
    const deadline = getIntakeDeadline("2026-11-16T14:00:00.000Z");
    expect(deadline.toISOString()).toBe("2026-11-16T12:00:00.000Z");
  });
});

describe("formatIntakeDeadline", () => {
  it("formats as dd/MM às HHhmm in America/Sao_Paulo", () => {
    // 14:00 UTC = 11:00 BRT, minus 2h = 09:00 BRT
    expect(formatIntakeDeadline("2026-11-16T14:00:00.000Z")).toBe("16/11 às 09h00");
  });
});
