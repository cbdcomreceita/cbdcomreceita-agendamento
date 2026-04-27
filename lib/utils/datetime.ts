import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

/**
 * Single source of truth for the application's display timezone.
 *
 * IMPORTANT: never use plain `format()` from date-fns on booking dates.
 * Vercel runs in UTC, so `format(d, "HH:mm")` would print 14:00 instead
 * of 11:00 for an 11:00 BRT slot. Always go through these helpers (or
 * `formatInTimeZone(d, TIMEZONE, ...)` directly) so server- and
 * client-rendered output match regardless of where the code runs.
 */
export const TIMEZONE = "America/Sao_Paulo";

/** "quinta-feira, 1 de maio às 11:00" */
export function formatDateLong(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE, d 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  });
}

/** "quinta-feira, 1 de maio de 2026" */
export function formatDateLongNoTime(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
}

/** "01/05/2026" */
export function formatDateBR(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "dd/MM/yyyy");
}

/** "01/05" */
export function formatDateBRShort(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "dd/MM");
}

/** "11:00" */
export function formatTime(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "HH:mm");
}

/** "01/05/2026 11:00" */
export function formatDateTimeBR(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "dd/MM/yyyy HH:mm");
}
