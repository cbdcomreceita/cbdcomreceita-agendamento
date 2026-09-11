import { describe, expect, it } from "vitest";
import { extractMeetCode, isValidMeetLink, normalizePhoneToVariants, searchOrder } from "./phone";

describe("normalizePhoneToVariants", () => {
  it("11 digits (modern mobile, with 9th digit) — offers a without-9 fallback", () => {
    const v = normalizePhoneToVariants("11999998888");
    expect(v).toEqual({ primary: "+5511999998888", fallback: "+551199998888" });
  });

  it("11 digits not actually 9-prefixed — no fallback offered", () => {
    // Defensive case: 11 digits but the subscriber doesn't start with 9.
    const v = normalizePhoneToVariants("11599998888");
    expect(v).toEqual({ primary: "+5511599998888", fallback: undefined });
  });

  it("10 digits, legacy mobile prefix (6-9) — with-9 is primary, as-stored is fallback", () => {
    const v = normalizePhoneToVariants("1199998888");
    expect(v).toEqual({ primary: "+5511999998888", fallback: "+551199998888" });
  });

  it("10 digits, landline prefix (2-5) — single variant, no 9-insertion", () => {
    const v = normalizePhoneToVariants("1133334444");
    expect(v).toEqual({ primary: "+551133334444" });
  });

  it("accepts a masked phone, stripping non-digits", () => {
    const v = normalizePhoneToVariants("(11) 99999-8888");
    expect(v).toEqual({ primary: "+5511999998888", fallback: "+551199998888" });
  });

  it("accepts a phone already carrying +55, stripping it then re-adding via digits", () => {
    // +55 contributes 2 extra digits, pushing an 11-digit mobile to 13 — invalid.
    const v = normalizePhoneToVariants("+5511999998888");
    expect(v).toBeNull();
  });

  it("rejects too-short input", () => {
    expect(normalizePhoneToVariants("123456789")).toBeNull();
  });

  it("rejects too-long input", () => {
    expect(normalizePhoneToVariants("119999988877")).toBeNull();
  });
});

describe("searchOrder", () => {
  it("returns [primary, fallback] when a fallback exists", () => {
    expect(searchOrder({ primary: "+5511999998888", fallback: "+551199998888" })).toEqual([
      "+5511999998888",
      "+551199998888",
    ]);
  });

  it("returns just [primary] when there's no fallback", () => {
    expect(searchOrder({ primary: "+551133334444" })).toEqual(["+551133334444"]);
  });
});

describe("extractMeetCode / isValidMeetLink", () => {
  it("extracts the code from a valid Meet link", () => {
    expect(extractMeetCode("https://meet.google.com/abc-defg-hij")).toBe("abc-defg-hij");
  });

  it("is case-insensitive", () => {
    expect(extractMeetCode("https://meet.google.com/ABC-DEFG-HIJ")).toBe("ABC-DEFG-HIJ");
  });

  it("returns null for the mock-mode link", () => {
    expect(extractMeetCode("https://meet.google.com/mock-link")).toBeNull();
  });

  it("returns null for null/undefined/empty", () => {
    expect(extractMeetCode(null)).toBeNull();
    expect(extractMeetCode(undefined)).toBeNull();
    expect(extractMeetCode("")).toBeNull();
  });

  it("isValidMeetLink mirrors extractMeetCode", () => {
    expect(isValidMeetLink("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isValidMeetLink("https://meet.google.com/mock-link")).toBe(false);
    expect(isValidMeetLink(null)).toBe(false);
  });
});
