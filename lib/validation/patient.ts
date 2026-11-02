import { z } from "zod/v4";
import { validateCpf } from "@/lib/utils/cpf";
import { DEFAULT_COUNTRY, isValidPhoneForCountry, phoneErrorMessage, toE164 } from "@/lib/validation/phone";
import type { CountryCode } from "libphonenumber-js";

export const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

export const patientSchema = z
  .object({
    fullName: z
      .string()
      .min(5, "Nome muito curto")
      .refine((v) => v.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome"),
    email: z.email("E-mail inválido"),
    // Validated against phoneCountry in .check() below (isValidPhoneForCountry
    // needs both fields at once — a per-field .pipe() can't see phoneCountry).
    // Country code (BR, US, PT, ...) — see lib/validation/phone.ts.
    phoneCountry: z.string().length(2).default(DEFAULT_COUNTRY),
    phone: z.string().min(1, "Telefone obrigatório"),
    cpf: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(
        z.string().length(11, "CPF inválido").refine(validateCpf, "CPF inválido")
      ),
    rg: z.string().min(5, "RG muito curto").optional(),
    birthDate: z.string().min(1, "Data de nascimento obrigatória").optional(),

    // Address
    cep: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().length(8, "CEP inválido"))
      .optional(),
    street: z.string().min(3, "Rua obrigatória").optional(),
    number: z.string().min(1, "Número obrigatório").optional(),
    complement: z.string().optional(),
    district: z.string().min(2, "Bairro obrigatório").optional(),
    city: z.string().min(2, "Cidade obrigatória").optional(),
    state: z.enum(UF_OPTIONS, { message: "Estado inválido" }).optional(),

    // Clinical
    hasCurrentMedication: z.boolean(),
    currentMedications: z.string().optional(),

    // Consent
    lgpdConsent: z.literal(true, { message: "Consentimento obrigatório" }),
    termsConsent: z.literal(true, { message: "Consentimento obrigatório" }),
    whatsappConsent: z.literal(true, { message: "Consentimento obrigatório" }),
    lgpdConsentAt: z.string().optional(),
    termsConsentAt: z.string().optional(),
    whatsappConsentAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const country = data.phoneCountry as CountryCode;
    if (!isValidPhoneForCountry(data.phone, country)) {
      ctx.issues.push({
        code: "custom",
        message: phoneErrorMessage(country),
        path: ["phone"],
        input: data.phone,
      });
    }
  });

export type PatientFormData = z.infer<typeof patientSchema>;

/** E.164 form of a validated PatientFormData's phone — call after safeParse succeeds. */
export function patientPhoneE164(data: PatientFormData): string {
  const e164 = toE164(data.phone, data.phoneCountry as CountryCode);
  if (!e164) throw new Error("patientPhoneE164 called with an unvalidated/invalid phone");
  return e164;
}
