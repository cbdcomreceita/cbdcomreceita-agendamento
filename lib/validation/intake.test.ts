import { describe, expect, it } from "vitest";
import { buildIntakeSchema, intakeSchema } from "./intake";

const VALID = {
  patientFullName: "Lais Teste Paciente",
  patientCpf: "411.452.858-05",
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

  it("rejects a one-word patient name", () => {
    const result = intakeSchema.safeParse({ ...VALID, patientFullName: "Lais" });
    expect(result.success).toBe(false);
  });
});

describe("buildIntakeSchema — CPF required for an adult patient", () => {
  const adultSchema = buildIntakeSchema(false);

  it("requires patientCpf when isMinor is false", () => {
    const result = adultSchema.safeParse({ ...VALID, patientCpf: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid CPF even when present", () => {
    const result = adultSchema.safeParse({ ...VALID, patientCpf: "111.111.111-11" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid CPF", () => {
    const result = adultSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });
});

describe("buildIntakeSchema — CPF optional for a minor patient", () => {
  const minorSchema = buildIntakeSchema(true);

  it("accepts a missing patientCpf when isMinor is true", () => {
    const result = minorSchema.safeParse({ ...VALID, patientCpf: undefined });
    expect(result.success).toBe(true);
  });

  it("still rejects an invalid CPF if one is provided", () => {
    const result = minorSchema.safeParse({ ...VALID, patientCpf: "111.111.111-11" });
    expect(result.success).toBe(false);
  });
});
