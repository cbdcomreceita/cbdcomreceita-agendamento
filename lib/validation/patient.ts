import { z } from "zod/v4";
import { validateCpf } from "@/lib/utils/cpf";
import { DEFAULT_COUNTRY, isValidPhoneForCountry, phoneErrorMessage, toE164 } from "@/lib/validation/phone";
import type { CountryCode } from "libphonenumber-js";

export const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

/**
 * RG, birth date and address are required in the current /dados form and
 * optional in the light form (LIGHT_FORM_ENABLED — Entrega 2 moves them to
 * the prontuário). Both variants share this base shape (all required) and
 * diverge via .partial() below, so the "required" validation (length,
 * format) only has to be written once.
 */
const patientBaseShape = z.object({
  fullName: z
    .string()
    .min(5, "Nome muito curto")
    .refine((v) => v.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  email: z.email("E-mail inválido"),
  // Validated against phoneCountry in .superRefine() below (isValidPhoneForCountry
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
  rg: z.string().min(5, "RG muito curto"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),

  // Address
  cep: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().length(8, "CEP inválido")),
  street: z.string().min(3, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  district: z.string().min(2, "Bairro obrigatório"),
  city: z.string().min(2, "Cidade obrigatória"),
  state: z.enum(UF_OPTIONS, { message: "Estado inválido" }),

  // Consent
  lgpdConsent: z.literal(true, { message: "Consentimento obrigatório" }),
  termsConsent: z.literal(true, { message: "Consentimento obrigatório" }),
  whatsappConsent: z.literal(true, { message: "Consentimento obrigatório" }),
  lgpdConsentAt: z.string().optional(),
  termsConsentAt: z.string().optional(),
  whatsappConsentAt: z.string().optional(),
});

function withPhoneRefine<T extends z.ZodObject<{ phone: z.ZodString; phoneCountry: z.ZodDefault<z.ZodString> }>>(
  schema: T
) {
  return schema.superRefine((data, ctx) => {
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
}

const LIGHT_OPTIONAL_FIELDS = {
  rg: true,
  birthDate: true,
  cep: true,
  street: true,
  number: true,
  district: true,
  city: true,
  state: true,
} as const;

/** Current /dados form (LIGHT_FORM_ENABLED off) — RG, nascimento, endereço required. */
export const patientSchemaFull = withPhoneRefine(patientBaseShape);

/** Light /dados form (LIGHT_FORM_ENABLED on) — RG, nascimento, endereço move to the prontuário. */
export const patientSchemaLight = withPhoneRefine(patientBaseShape.partial(LIGHT_OPTIONAL_FIELDS));

/** Shared form-data type — the permissive (light) shape, since useForm is
 * typed once but validated against either schema depending on the flag. */
export type PatientFormData = z.infer<typeof patientSchemaLight>;

/** E.164 form of a validated PatientFormData's phone — call after safeParse succeeds. */
export function patientPhoneE164(data: PatientFormData): string {
  const e164 = toE164(data.phone, data.phoneCountry as CountryCode);
  if (!e164) throw new Error("patientPhoneE164 called with an unvalidated/invalid phone");
  return e164;
}
