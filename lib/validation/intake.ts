import { z } from "zod/v4";
import { UF_OPTIONS } from "@/lib/validation/patient";
import { validateCpf } from "@/lib/utils/cpf";

/**
 * Collected on /prontuario/[token] — the PACIENTE's own identity and
 * address. The light /dados form only ever collects the RESPONSÁVEL
 * (contato do agendamento); this form is where the two can diverge (e.g. a
 * parent booking for a child). patientCpf is required for an adult patient
 * and optional for a minor (isMinor comes from the booking's triage data,
 * decided server-side — see buildIntakeSchema).
 */
export const intakeBaseSchema = z.object({
  patientFullName: z
    .string()
    .min(5, "Nome muito curto")
    .refine((v) => v.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  patientCpf: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : v)),
  rg: z.string().min(5, "RG muito curto"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
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
});

/** isMinor decides whether patientCpf is required — always validated against the real CPF algorithm when present, minor or not. */
export function buildIntakeSchema(isMinor: boolean) {
  return intakeBaseSchema.superRefine((data, ctx) => {
    if (!data.patientCpf) {
      if (!isMinor) {
        ctx.issues.push({ code: "custom", message: "CPF obrigatório", path: ["patientCpf"], input: data.patientCpf });
      }
      return;
    }
    if (data.patientCpf.length !== 11 || !validateCpf(data.patientCpf)) {
      ctx.issues.push({ code: "custom", message: "CPF inválido", path: ["patientCpf"], input: data.patientCpf });
    }
  });
}

/** Permissive shape for useForm's generic type — validated against buildIntakeSchema(isMinor) at submit time. */
export const intakeSchema = intakeBaseSchema;
export type IntakeFormData = z.infer<typeof intakeBaseSchema>;
