import { describe, expect, it } from "vitest";
import { formatTodayTomorrowLabel, formatWeekdayDateShort } from "./datetime";

describe("formatWeekdayDateShort", () => {
  it("formats as 'weekday, dd/MM' in pt-BR, America/Sao_Paulo", () => {
    // 2026-11-05 is a Thursday in BRT
    expect(formatWeekdayDateShort("2026-11-05T14:00:00.000Z")).toBe("quinta-feira, 05/11");
  });
});

describe("formatTodayTomorrowLabel", () => {
  const now = new Date("2026-11-05T15:00:00.000Z"); // 12:00 BRT

  it("returns 'hoje' for a time on the same BRT calendar day", () => {
    expect(formatTodayTomorrowLabel("2026-11-05T23:00:00.000Z", now)).toBe("hoje");
  });

  it("returns 'amanhã, dd/MM' for the next BRT calendar day", () => {
    expect(formatTodayTomorrowLabel("2026-11-06T14:00:00.000Z", now)).toBe("amanhã, 06/11");
  });

  it("falls back to dd/MM for anything further out", () => {
    expect(formatTodayTomorrowLabel("2026-11-10T14:00:00.000Z", now)).toBe("10/11");
  });
});
