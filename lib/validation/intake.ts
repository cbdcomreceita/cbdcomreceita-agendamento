import { z } from "zod/v4";
import { UF_OPTIONS } from "@/lib/validation/patient";

/**
 * Collected on /prontuario/[token] — exactly the fields the light /dados
 * form (LIGHT_FORM_ENABLED) left out: RG, nascimento and endereço. Mirrors
 * patientBaseShape's required variants in lib/validation/patient.ts so the
 * same field names/messages stay consistent across both forms.
 */
export const intakeSchema = z.object({
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

export type IntakeFormData = z.infer<typeof intakeSchema>;
