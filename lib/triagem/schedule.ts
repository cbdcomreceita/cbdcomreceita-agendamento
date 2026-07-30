import { toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/utils/datetime";
import type { Weekday, Period } from "@/lib/types/availability";

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const PERIOD_LABELS: Record<Period, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const PERIOD_ORDER: Record<Period, number> = {
  manha: 0,
  tarde: 1,
  noite: 2,
};

/** Cal.com slot ISO time -> the period bucket it falls in, for preference highlighting. */
export function periodForHour(hour: number): Period {
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

/** Weekday (0=domingo) of an ISO time in the app's display timezone, not the server/runtime's. */
export function getWeekdayInTimezone(iso: string | Date): Weekday {
  return toZonedTime(iso, TIMEZONE).getDay() as Weekday;
}
