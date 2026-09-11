import { Client, Receiver } from "@upstash/qstash";

/**
 * QStash publishing + signature verification for the WhatsApp confirmation
 * flow. Chosen over Next.js `after()` because Vercel Hobby's Fluid Compute
 * doesn't guarantee `after()` runs to completion after the response is
 * sent — QStash gives us a durable, retried delivery instead, and its
 * webhook target (our route) can independently be re-triggered if needed.
 * Same Upstash account family already used for rate limiting (lib/rate-limit).
 */

export const SEND_CONFIRMATION_PATH = "/api/whatsapp/send-confirmation";
export const VERIFY_DELIVERY_PATH = "/api/whatsapp/verify-delivery";

/**
 * Deliberately its OWN env var, not NEXT_PUBLIC_SITE_URL: the bare apex
 * domain (cbdcomreceita.com.br) 307-redirects everything, including /api
 * routes, to https://www.cbdcomreceita.com.br. QStash does not follow
 * redirects for webhook delivery the way a browser does, so the callback
 * URL must be the exact www address. Also deliberately NOT falling back to
 * VERCEL_URL: on a preview deployment VERCEL_URL points at a
 * Vercel-protected preview alias QStash can't reach anyway.
 *
 * Both publishing (publishSendConfirmation/publishVerifyDelivery) and
 * signature verification (verifyQstashSignature) call this same function,
 * so the URL QStash is told to call and the URL we verify against can
 * never drift apart.
 */
export function getCallbackBaseUrl(): string {
  const raw = process.env.WHATSAPP_CALLBACK_BASE_URL;
  if (!raw) throw new Error("WHATSAPP_CALLBACK_BASE_URL not configured");
  if (!raw.startsWith("https://")) {
    throw new Error("WHATSAPP_CALLBACK_BASE_URL must start with https://");
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getClient(): Client {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN not configured");
  const baseUrl = process.env.QSTASH_URL;
  if (!baseUrl) throw new Error("QSTASH_URL not configured");
  return new Client({ token, baseUrl });
}

/** Enqueues the initial send — fired right after payment confirmation. */
export async function publishSendConfirmation(bookingId: string): Promise<void> {
  const client = getClient();
  await client.publishJSON({
    url: `${getCallbackBaseUrl()}${SEND_CONFIRMATION_PATH}`,
    body: { bookingId },
  });
}

/**
 * Enqueues the delivery-verification check a few minutes after sending —
 * NexTalk doesn't push status changes, so we have to poll once.
 */
export async function publishVerifyDelivery(
  notificationLogId: string,
  delaySeconds = 180
): Promise<void> {
  const client = getClient();
  await client.publishJSON({
    url: `${getCallbackBaseUrl()}${VERIFY_DELIVERY_PATH}`,
    body: { notificationLogId },
    delay: delaySeconds,
  });
}

export function getReceiver(): Receiver {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error("QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY not configured");
  }
  return new Receiver({ currentSigningKey, nextSigningKey });
}

/**
 * Verifies the Upstash-Signature header. `path` should be the route's own
 * path (SEND_CONFIRMATION_PATH or VERIFY_DELIVERY_PATH) — passing it
 * reconstructs the expected URL via the same getCallbackBaseUrl() used at
 * publish time, so verification is checked against the exact URL QStash
 * was told to call. Returns false (never throws) on any failure, including
 * a missing/misconfigured WHATSAPP_CALLBACK_BASE_URL.
 */
export async function verifyQstashSignature(
  signature: string | null,
  body: string,
  path: string
): Promise<boolean> {
  if (!signature) return false;
  try {
    const url = `${getCallbackBaseUrl()}${path}`;
    return await getReceiver().verify({ signature, body, url });
  } catch {
    return false;
  }
}
