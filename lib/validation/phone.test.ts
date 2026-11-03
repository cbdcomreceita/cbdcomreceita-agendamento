import { describe, expect, it } from "vitest";
import { isValidPhoneForCountry, toE164 } from "./phone";

describe("toE164 — Brazil", () => {
  it("accepts a valid 11-digit mobile with a valid DDD", () => {
    expect(toE164("11987654321", "BR")).toBe("+5511987654321");
  });

  it("accepts a masked valid mobile", () => {
    expect(toE164("(11) 98765-4321", "BR")).toBe("+5511987654321");
  });

  it("rejects a 10-digit landline", () => {
    expect(toE164("1133334444", "BR")).toBeNull();
  });

  it("rejects 11 digits not starting with 9 after the DDD", () => {
    expect(toE164("11887654321", "BR")).toBeNull();
  });

  it("rejects an invalid DDD", () => {
    expect(toE164("00987654321", "BR")).toBeNull();
  });

  it("strips a pasted +55 prefix before validating", () => {
    expect(toE164("+5511987654321", "BR")).toBe("+5511987654321");
  });

  it("strips a pasted 55 prefix (no +) before validating", () => {
    expect(toE164("5511987654321", "BR")).toBe("+5511987654321");
  });
});

describe("toE164 — foreign", () => {
  it("accepts a valid Portuguese mobile", () => {
    expect(toE164("912345678", "PT")).toBe("+351912345678");
  });

  it("accepts a valid US number", () => {
    expect(toE164("2025551234", "US")).toBe("+12025551234");
  });

  it("rejects an invalid number for the selected country", () => {
    expect(toE164("123", "US")).toBeNull();
  });
});

describe("isValidPhoneForCountry", () => {
  it("mirrors toE164's verdict", () => {
    expect(isValidPhoneForCountry("11987654321", "BR")).toBe(true);
    expect(isValidPhoneForCountry("1133334444", "BR")).toBe(false);
  });
});
