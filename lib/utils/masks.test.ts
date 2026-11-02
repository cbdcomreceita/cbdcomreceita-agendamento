import { describe, expect, it } from "vitest";
import { maskPhone } from "./masks";

describe("maskPhone", () => {
  it("legacy 11-digit BR, no DDI", () => {
    expect(maskPhone("11999998888")).toBe("(11) 99999-8888");
  });

  it("legacy 10-digit BR landline, no DDI", () => {
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("E.164 +55 — formatted the same as the legacy BR mask", () => {
    expect(maskPhone("+5511999998888")).toBe("(11) 99999-8888");
  });

  it("E.164 foreign number — international format, left as-is", () => {
    expect(maskPhone("+12025551234")).toBe("+1 202 555 1234");
  });

  it("falls back to the raw value when E.164 parsing fails", () => {
    expect(maskPhone("+0")).toBe("+0");
  });
});
