import { NEXTALK_INBOX_ID } from "./config";
import { nextalkGet, nextalkPostCreate } from "./nextalk-client";
import { assertFiniteNumber, readNumericField, unwrapNextalkObject } from "./nextalk-response";
import type { NextalkConversationListResponse } from "./types";

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
 * The create-response shape is read tolerantly (bare object, or wrapped in
 * `payload`/`data`) via nextalk-response.ts — this account's real API was
 * found not to match the bare-object shape the PDF documents for this
 * endpoint, which is how "undefined" ended up written to
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
  const obj = unwrapNextalkObject(raw, "display_id", context);
  const displayId = readNumericField(obj, "display_id", context, raw);
  return { displayId, createRaw: raw };
}
