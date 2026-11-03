import { describe, expect, it } from "vitest";
import { intakeSchema } from "./intake";

const VALID = {
  rg: "123456789",
  birthDate: "1990-01-01",
  cep: "01310-100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP" as const,
};

describe("intakeSchema", () => {
  it("accepts a fully filled form", () => {
    expect(intakeSchema.safeParse(VALID).success).toBe(true);
  });

  it("strips non-digits from cep and requires exactly 8 digits", () => {
    const result = intakeSchema.safeParse(VALID);
    expect(result.success && result.data.cep).toBe("01310100");
  });

  it("rejects a short RG", () => {
    const result = intakeSchema.safeParse({ ...VALID, rg: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid UF", () => {
    const result = intakeSchema.safeParse({ ...VALID, state: "XX" });
    expect(result.success).toBe(false);
  });

  it("allows an empty complement", () => {
    const result = intakeSchema.safeParse({ ...VALID, complement: undefined });
    expect(result.success).toBe(true);
  });
});
