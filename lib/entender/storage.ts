import type { ParaQuem } from "./copy";

export interface EntenderRespostas {
  para_quem: ParaQuem;
  sintomas: string[];
  duvidas: string[];
}

const STORAGE_KEY = "entender_respostas";

export function saveEntenderRespostas(data: EntenderRespostas): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadEntenderRespostas(): EntenderRespostas | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EntenderRespostas;
  } catch {
    return null;
  }
}

export function clearEntenderRespostas(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
