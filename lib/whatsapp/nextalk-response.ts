/**
 * NexTalk's documented response shapes (docs/nextalk-api-lembrete.pdf) don't
 * always match what this account's API actually returns — confirmed for
 * POST /conversations, whose response was expected to be a bare
 * {id, display_id, ...} object but wasn't, which is what let `undefined`
 * silently reach notifications_log.nextalk_conversation_display_id.
 *
 * These helpers make field extraction tolerant of the shapes NexTalk is
 * known to use in this account (bare object, or wrapped in `payload` /
 * `data`), while still treating a wrong-typed field as a hard error rather
 * than a cue to try another shape — a present-but-malformed field means
 * something is actually wrong, not that we guessed the wrapper incorrectly.
 */

const MAX_RAW_DUMP = 4000;

function stringifyRaw(raw: unknown): string {
  try {
    const text = JSON.stringify(raw);
    return text.length > MAX_RAW_DUMP ? `${text.slice(0, MAX_RAW_DUMP)}…(truncado)` : text;
  } catch {
    return String(raw);
  }
}

/** Thrown whenever a NexTalk response doesn't have the field we need in a usable form. Always carries the raw body so it ends up in error_message/external_error and the team's alert email without needing a DB lookup. */
export class NextalkResponseShapeError extends Error {
  raw: unknown;
  constructor(context: string, problem: string, raw: unknown) {
    super(`${context}: ${problem} — raw: ${stringifyRaw(raw)}`);
    this.name = "NextalkResponseShapeError";
    this.raw = raw;
  }
}

/**
 * Finds the object level that actually holds `probeField` — tries the raw
 * body itself, then `raw.payload`, then `raw.data`, in that order, and
 * commits to the first level where the key is *present* (regardless of its
 * value). Callers then validate that field's value (e.g. with
 * readNumericField) — a bad value at the committed level is a real error,
 * never a reason to fall through to the next wrapper.
 */
export function unwrapNextalkObject(
  raw: unknown,
  probeField: string,
  context: string
): Record<string, unknown> {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    throw new NextalkResponseShapeError(context, "resposta vazia ou não é um objeto", raw);
  }
  const obj = raw as Record<string, unknown>;
  const candidates: unknown[] = [obj, obj.payload, obj.data];
  for (const candidate of candidates) {
    if (candidate !== null && typeof candidate === "object" && probeField in candidate) {
      return candidate as Record<string, unknown>;
    }
  }
  throw new NextalkResponseShapeError(
    context,
    `campo "${probeField}" não encontrado em nenhuma forma conhecida (objeto plano, payload, data)`,
    raw
  );
}

/** Reads `field` off an already-unwrapped object, requiring a finite number. */
export function readNumericField(
  obj: Record<string, unknown>,
  field: string,
  context: string,
  raw: unknown
): number {
  const value = obj[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new NextalkResponseShapeError(
    context,
    `campo "${field}" presente mas não é um número válido (${stringifyRaw(value)})`,
    raw
  );
}

/** For shapes we already know aren't wrapped — validates a value directly, no unwrapping. */
export function assertFiniteNumber(value: unknown, field: string, context: string, raw: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new NextalkResponseShapeError(
    context,
    `campo "${field}" ausente ou inválido (${stringifyRaw(value)})`,
    raw
  );
}
