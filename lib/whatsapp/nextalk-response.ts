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

/** Recursively lists `key=value` for every numeric field found (raw body + one level of nesting, covering `payload`/`data` wrappers). */
function listNumericFields(raw: unknown, depth = 2, prefix = ""): string[] {
  if (raw === null || typeof raw !== "object" || depth < 0) return [];
  const found: string[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number") {
      found.push(`${prefix}${key}=${value}`);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value) && depth > 0) {
      found.push(...listNumericFields(value, depth - 1, `${prefix}${key}.`));
    }
  }
  return found;
}

/** For shape-mismatch error messages — names every numeric field actually present, so the next mismatch is diagnosable straight from the alert email instead of needing a fresh manual test. */
function describeNumericFields(raw: unknown): string {
  const fields = listNumericFields(raw);
  return fields.length > 0
    ? `campos numéricos disponíveis: ${fields.join(", ")}`
    : "nenhum campo numérico encontrado na resposta";
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
    `campo "${probeField}" não encontrado em nenhuma forma conhecida (objeto plano, payload, data) — ${describeNumericFields(raw)}`,
    raw
  );
}

/**
 * Like unwrapNextalkObject, but tries several field names in priority
 * order — for endpoints where a NexTalk account is known to omit the
 * PDF-documented field and only return an alternate one (see
 * conversation.ts: account 5's POST /conversations doesn't return
 * `display_id`, only `id`). Commits to the first candidate object where
 * ANY of the fields is present — a wrong-typed value there is still a hard
 * error, never a reason to try the next wrapper.
 */
export function unwrapNextalkObjectAny(
  raw: unknown,
  probeFields: string[],
  context: string
): Record<string, unknown> {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    throw new NextalkResponseShapeError(context, "resposta vazia ou não é um objeto", raw);
  }
  const obj = raw as Record<string, unknown>;
  const candidates: unknown[] = [obj, obj.payload, obj.data];
  for (const candidate of candidates) {
    if (candidate !== null && typeof candidate === "object" && probeFields.some((f) => f in candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  throw new NextalkResponseShapeError(
    context,
    `nenhum dos campos [${probeFields.join(", ")}] foi encontrado em nenhuma forma conhecida (objeto plano, payload, data) — ${describeNumericFields(raw)}`,
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
    `campo "${field}" presente mas não é um número válido (${stringifyRaw(value)}) — ${describeNumericFields(raw)}`,
    raw
  );
}

/**
 * Reads the first field (in priority order) that's actually present on an
 * already-unwrapped object, requiring it to be a finite number. A field
 * that's present but the wrong type is a hard error there — it never falls
 * through to try the next candidate field name.
 */
export function readNumericFieldWithFallback(
  obj: Record<string, unknown>,
  fields: string[],
  context: string,
  raw: unknown
): number {
  for (const field of fields) {
    if (field in obj) return readNumericField(obj, field, context, raw);
  }
  throw new NextalkResponseShapeError(
    context,
    `nenhum dos campos [${fields.join(", ")}] está presente — ${describeNumericFields(raw)}`,
    raw
  );
}

/** For shapes we already know aren't wrapped — validates a value directly, no unwrapping. */
export function assertFiniteNumber(value: unknown, field: string, context: string, raw: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new NextalkResponseShapeError(
    context,
    `campo "${field}" ausente ou inválido (${stringifyRaw(value)}) — ${describeNumericFields(raw)}`,
    raw
  );
}
