import { describe, expect, it } from "vitest";
import { classifyPeriod } from "./config";

// TIMEZONE is America/Sao_Paulo — these ISO instants are chosen so their
// local wall-clock hour falls cleanly on each side of the manhã/tarde/noite
// boundaries regardless of DST (America/Sao_Paulo has used UTC-3 year-round
// since 2019).
describe("classifyPeriod", () => {
  it("classifies before noon as manha", () => {
    expect(classifyPeriod("2026-11-09T11:00:00.000Z")).toBe("manha"); // 08:00 BRT
  });

  it("classifies the last minute of the morning as manha", () => {
    expect(classifyPeriod("2026-11-09T14:59:00.000Z")).toBe("manha"); // 11:59 BRT
  });

  it("classifies noon as tarde", () => {
    expect(classifyPeriod("2026-11-09T15:00:00.000Z")).toBe("tarde"); // 12:00 BRT
  });

  it("classifies the last minute of the afternoon as tarde", () => {
    expect(classifyPeriod("2026-11-09T20:59:00.000Z")).toBe("tarde"); // 17:59 BRT
  });

  it("classifies 18:00 as noite", () => {
    expect(classifyPeriod("2026-11-09T21:00:00.000Z")).toBe("noite"); // 18:00 BRT
  });

  it("classifies late evening as noite", () => {
    expect(classifyPeriod("2026-11-10T01:00:00.000Z")).toBe("noite"); // 22:00 BRT
  });
});
