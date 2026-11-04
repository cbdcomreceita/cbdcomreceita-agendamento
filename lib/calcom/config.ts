import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/utils/datetime";
import type { Period } from "@/lib/types/availability";

/** Minimum lead time before a slot can be booked — Entrega 2, item 8. */
export const MIN_LEAD_HOURS = 24;

/**
 * Classifies a real Cal.com slot time into a period bucket, for Entrega 3's
 * "3 next agendas" blocks (médico + dia + período). This is independent of
 * doctor_availability's own manhã/tarde/noite rows — those just drive the
 * triagem's day/period selector; this classifies the doctor's ACTUAL free
 * times from Cal.com, which is what a block groups by.
 */
export function classifyPeriod(iso: string): Period {
  const hour = Number(formatInTimeZone(iso, TIMEZONE, "H"));
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}
