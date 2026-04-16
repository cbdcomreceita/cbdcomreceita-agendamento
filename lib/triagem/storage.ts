import type { TriageData } from "./schemas";

const STORAGE_KEY = "triage_data_v1";

export function saveTriageData(data: Partial<TriageData>): void {
  if (typeof window === "undefined") return;
  const existing = loadTriageData();
  const merged = { ...existing, ...data };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function loadTriageData(): Partial<TriageData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<TriageData>;
  } catch {
    return {};
  }
}

export function clearTriageData(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
