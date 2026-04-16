import { z } from "zod/v4";
import { validateCpf } from "@/lib/utils/cpf";

export const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

export const patientSchema = z.object({
  fullName: z
    .string()
    .min(5, "Nome muito curto")
    .refine((v) => v.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  email: z.email("E-mail inválido"),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().min(10, "Telefone inválido").max(11, "Telefone inválido")),
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

  // Clinical
  hasCurrentMedication: z.boolean(),
  currentMedications: z.string().optional(),

  // Consent
  lgpdConsent: z.literal(true, { message: "Consentimento obrigatório" }),
  termsConsent: z.literal(true, { message: "Consentimento obrigatório" }),
  lgpdConsentAt: z.string().optional(),
  termsConsentAt: z.string().optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;
