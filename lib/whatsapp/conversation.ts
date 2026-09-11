import { NEXTALK_INBOX_ID } from "./config";
import { nextalkGet, nextalkPostCreate } from "./nextalk-client";
import type {
  NextalkConversationListResponse,
  NextalkCreateConversationResponse,
} from "./types";

const REUSABLE_STATUSES = new Set(["open", "pending", "snoozed"]);

export interface ConversationContext {
  bookingId: string;
  dateBR: string;
  timeH: string;
  doctorName: string;
  meetLink: string;
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
 */
export async function findOrCreateConversation(
  contactId: number,
  ctx: ConversationContext
): Promise<number> {
  const list = await nextalkGet<NextalkConversationListResponse>(
    `/contacts/${contactId}/conversations`
  );
  const existing = list.payload.find(
    (c) => c.inbox_id === NEXTALK_INBOX_ID && REUSABLE_STATUSES.has(c.status)
  );
  if (existing) return existing.id;

  const created = await nextalkPostCreate<NextalkCreateConversationResponse>(
    "/conversations",
    {
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
    }
  );
  return created.display_id;
}
