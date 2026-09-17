import { NEXTALK_INBOX_ID } from "./config";
import { nextalkGet, nextalkPostCreate } from "./nextalk-client";
import {
  assertFiniteNumber,
  readNumericFieldWithFallback,
  unwrapNextalkObjectAny,
} from "./nextalk-response";
import type { NextalkConversationListResponse } from "./types";

/**
 * Field priority for POST /conversations' create-response id. The PDF
 * (§6.3) documents both `id` (internal, don't use) and `display_id` (use
 * this one) — but account 5's real API was confirmed (2026-09-16) to omit
 * `display_id` entirely and only return `id`, which on THIS endpoint turns
 * out to already BE the display_id: the `id` a real creation returned
 * (265) matched exactly the `id` that GET /contacts/{id}/conversations
 * returned for that same conversation — and the PDF's own §6.1 note says
 * that list endpoint's `id` IS the display_id. So `display_id` is tried
 * first (per the PDF, in case another account/inbox does return it), and
 * `id` is the confirmed real fallback for this account.
 *
 * Do NOT "fix" this to require `display_id` only — that breaks conversation
 * creation on this account entirely.
 */
const CONVERSATION_CREATE_ID_FIELDS = ["display_id", "id"];

const REUSABLE_STATUSES = new Set(["open", "pending", "snoozed"]);

export interface ConversationContext {
  bookingId: string;
  dateBR: string;
  timeH: string;
  doctorName: string;
  meetLink: string;
}

export interface ConversationResult {
  displayId: number;
  /** Raw response body from POST /conversations — only set when a new conversation was actually created (null when an existing one was reused), per the "provider_response only for creations" rule. */
  createRaw: unknown | null;
}

/**
 * Passo 3 — reuses the contact's most recent open/pending/snoozed conversation
 * on our inbox, or creates a new one. The list endpoint is unfiltered and
 * always the 20 most recent by last_activity_at desc, so the first match is
 * the one to reuse.
 *
 * NOTE: on the list endpoint, `id` already IS the display_id (see
 * types.ts). On every other endpoint `display_id` is a separate field —
 * this function normalizes both into the display_id we return.
 *
 * The create-response id is read tolerantly via nextalk-response.ts: both
 * the object shape (bare, or wrapped in `payload`/`data`) and the field
 * name itself (`display_id`, falling back to `id` — see
 * CONVERSATION_CREATE_ID_FIELDS above) are treated as uncertain. This
 * account's real API doesn't match the PDF's documented bare-`display_id`
 * shape for this endpoint, which is how "undefined" ended up written to
 * notifications_log.nextalk_conversation_display_id before this fix.
 */
export async function findOrCreateConversation(
  contactId: number,
  ctx: ConversationContext
): Promise<ConversationResult> {
  const list = await nextalkGet<NextalkConversationListResponse>(
    `/contacts/${contactId}/conversations`
  );
  const existing = list.payload.find(
    (c) => c.inbox_id === NEXTALK_INBOX_ID && REUSABLE_STATUSES.has(c.status)
  );
  if (existing) {
    const displayId = assertFiniteNumber(
      existing.id,
      "id",
      "GET /contacts/{id}/conversations (reuso)",
      existing
    );
    return { displayId, createRaw: null };
  }

  const raw = await nextalkPostCreate<unknown>("/conversations", {
    inbox_id: NEXTALK_INBOX_ID,
    contact_id: contactId,
    status: "open",
    custom_attributes: {
      origem: "site-agendamento",
      booking_id: ctx.bookingId,
      data_consulta: ctx.dateBR,
      hora_consulta: ctx.timeH,
      medico: ctx.doctorName,
      meet_link: ctx.meetLink,
    },
  });
  const context = "POST /conversations (criação)";
  const obj = unwrapNextalkObjectAny(raw, CONVERSATION_CREATE_ID_FIELDS, context);
  const displayId = readNumericFieldWithFallback(obj, CONVERSATION_CREATE_ID_FIELDS, context, raw);
  return { displayId, createRaw: raw };
}
