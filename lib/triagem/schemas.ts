import { z } from "zod/v4";

export const stepBirthDateSchema = z.object({
  birthDate: z.string().refine(
    (val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      if (d > new Date()) return false;
      if (d.getFullYear() < 1900) return false;
      return true;
    },
    { message: "Data de nascimento inválida" }
  ),
});

export const step1Schema = z.object({
  selectedSymptoms: z.array(z.string()).min(1, "Selecione pelo menos um sintoma"),
});

export const step2Schema = z.object({
  duration: z.enum(["less_1m", "1_6m", "6_12m", "more_1y"]),
});

export const step3Schema = z.object({
  priorTreatment: z.enum(["never", "medication", "therapy", "other"]),
  priorTreatmentDetails: z.string().optional(),
});

export const step4Schema = z.object({
  priorCbdUse: z.enum(["never", "with_prescription", "self", "prefer_not_say"]),
});

export const triageDataSchema = z.object({
  birthDate: z.string().optional(),
  isMinor: z.boolean().optional(),
  isElderly: z.boolean().optional(),
  selectedSymptoms: z.array(z.string()).min(1),
  duration: z.enum(["less_1m", "1_6m", "6_12m", "more_1y"]).optional(),
  priorTreatment: z.enum(["never", "medication", "therapy", "other"]).optional(),
  priorTreatmentDetails: z.string().optional(),
  priorCbdUse: z.enum(["never", "with_prescription", "self", "prefer_not_say"]).optional(),
  matchedDoctorId: z.string().optional(),
});

export type TriageData = z.infer<typeof triageDataSchema>;
export type StepBirthDateData = z.infer<typeof stepBirthDateSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
