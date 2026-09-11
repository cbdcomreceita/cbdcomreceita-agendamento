import { NEXTALK_BASE_URL, getNextalkToken } from "./config";

/**
 * Low-level NexTalk HTTP client.
 *
 * Retry policy (per approval): NEVER retry a POST that creates something
 * (contact, contact_inbox link, conversation, message, kanban item, or a
 * move_to_stage). A retried create-POST could silently duplicate a WhatsApp
 * message to the patient or a card in the CRM. GET calls (and the
 * search-style POST /contacts/filter, which reads rather than creates) are
 * safe to retry — they're idempotent by nature.
 *
 * Resumability against duplicate creates is handled one layer up, in
 * notification-log.ts / orchestrate-confirmation.ts: each step only runs if
 * the notifications_log row doesn't already have that step's saved id.
 */

export class NextalkApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "NextalkApiError";
    this.status = status;
    this.body = body;
  }
}

function headers(): HeadersInit {
  const token = getNextalkToken();
  if (!token) {
    throw new Error("NEXTALK_API_TOKEN not configured");
  }
  return {
    api_access_token: token,
    "Content-Type": "application/json",
  };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function doFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${NEXTALK_BASE_URL}${path}`, {
    ...init,
    headers: headers(),
  });
  const body = await parseBody(res);
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `NexTalk ${init.method ?? "GET"} ${path} failed (${res.status})`;
    throw new NextalkApiError(res.status, body, message);
  }
  return body;
}

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Only retry transient failures (network errors, 429, 5xx) — never a
      // 4xx, which means the request itself was rejected and retrying
      // won't help.
      const status = err instanceof NextalkApiError ? err.status : null;
      const retryable = status === null || status === 429 || status >= 500;
      if (!retryable || attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * 2 ** attempt));
    }
  }
  throw lastErr;
}

/** GET — safe to retry, read-only. */
export async function nextalkGet<T>(path: string): Promise<T> {
  return withRetry(() => doFetch(path, { method: "GET" })) as Promise<T>;
}

/**
 * POST /contacts/filter is semantically a search (read), not a create — the
 * PDF itself treats it as query-only. Safe to retry.
 */
export async function nextalkPostSearch<T>(path: string, body: unknown): Promise<T> {
  return withRetry(() =>
    doFetch(path, { method: "POST", body: JSON.stringify(body) })
  ) as Promise<T>;
}

/**
 * POST that creates a resource (contact, conversation, message, kanban
 * item) — single attempt, no retry. If it throws, the caller decides what
 * to do (usually: log, mark failed, alert — never blindly resend).
 */
export async function nextalkPostCreate<T>(path: string, body: unknown): Promise<T> {
  return doFetch(path, { method: "POST", body: JSON.stringify(body) }) as Promise<T>;
}

/** PATCH — no retry, same reasoning as creates (it mutates state). */
export async function nextalkPatch<T>(path: string, body: unknown): Promise<T> {
  return doFetch(path, { method: "PATCH", body: JSON.stringify(body) }) as Promise<T>;
}
