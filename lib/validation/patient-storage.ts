import type { PatientFormData } from "./patient";

const STORAGE_KEY = "patient_data_v1";

export function savePatientData(data: PatientFormData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPatientData(): Partial<PatientFormData> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PatientFormData>;
  } catch {
    return null;
  }
}
