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

/** "14h30" — NexTalk's confirmacao_consulta template expects this separator, not "14:30". */
export function formatTimeH(iso: string | Date): string {
  return formatTime(iso).replace(":", "h");
}

/** "01/05/2026 11:00" */
export function formatDateTimeBR(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "dd/MM/yyyy HH:mm");
}

/**
 * ISO 8601 with explicit America/Sao_Paulo offset (e.g.
 * "2026-11-02T15:30:00.000-03:00") — the format Mercado Pago's
 * `date_of_expiration` expects.
 */
export function toMpExpirationIso(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
}

/** "02/11, segunda-feira" — pix_pendente WhatsApp template's {{3}}. */
export function formatDateDDMMWeekday(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "dd/MM, EEEE", { locale: ptBR });
}

/** "segunda-feira" — /confirmacao's {dia} placeholder. */
export function formatWeekdayLong(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE", { locale: ptBR });
}

/** "9 de novembro" — /confirmacao's {data} placeholder. */
export function formatDayMonthLong(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "d 'de' MMMM", { locale: ptBR });
}

/** "quarta-feira, 05/11" — confirmacao_consulta_v2's {{2}}. */
export function formatWeekdayDateShort(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE, dd/MM", { locale: ptBR });
}

/**
 * "hoje" when `iso` falls on the same America/Sao_Paulo calendar day as
 * now, "amanhã, dd/MM" when it's the next day, else "dd/MM" — used by
 * lembrete_prontuario_12h's {{3}}, which only ever fires inside a 12h
 * window before the consultation, so "today"/"tomorrow" is never ambiguous
 * in practice; the dd/MM fallback exists only for a clock/window edge case.
 */
export function formatTodayTomorrowLabel(iso: string | Date, now: Date = new Date()): string {
  const target = formatInTimeZone(iso, TIMEZONE, "yyyy-MM-dd");
  const today = formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
  const tomorrow = formatInTimeZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIMEZONE, "yyyy-MM-dd");
  if (target === today) return "hoje";
  if (target === tomorrow) return `amanhã, ${formatDateBRShort(iso)}`;
  return formatDateBRShort(iso);
}
