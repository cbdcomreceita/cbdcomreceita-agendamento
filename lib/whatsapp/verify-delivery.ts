import { logError } from "@/lib/audit/log-error";
import { alertForBooking, loadBookingContext } from "./booking-context";
import { nextalkGet } from "./nextalk-client";
import { getNotificationLog, updateNotificationLog } from "./notification-log";
import type { NextalkMessageResponse } from "./types";

/** GET /conversations/{id}/messages isn't documented with a fixed envelope — normalize both shapes. */
function extractMessages(body: unknown): NextalkMessageResponse[] {
  if (Array.isArray(body)) return body as NextalkMessageResponse[];
  if (body && typeof body === "object" && Array.isArray((body as { payload?: unknown }).payload)) {
    return (body as { payload: NextalkMessageResponse[] }).payload;
  }
  return [];
}

/**
 * Passo 6 — NexTalk doesn't push delivery status changes, so this runs once,
 * a few minutes after send, as a QStash-scheduled follow-up. Only acts on
 * rows still in `sent` with a saved message id; anything else (already
 * delivered/failed/skipped, or never actually sent) is a no-op.
 */
export async function verifyDelivery(notificationLogId: string): Promise<void> {
  try {
    const row = await getNotificationLog(notificationLogId);
    if (!row) return;
    if (row.status !== "sent" || !row.nextalk_message_id || !row.nextalk_conversation_display_id) {
      return;
    }

    const body = await nextalkGet<unknown>(
      `/conversations/${row.nextalk_conversation_display_id}/messages`
    );
    const match = extractMessages(body).find((m) => String(m.id) === row.nextalk_message_id);

    if (!match) {
      await logError({
        scope: "whatsapp",
        message: "verifyDelivery: message id not found in conversation history",
        metadata: { notificationLogId, messageId: row.nextalk_message_id },
        entityType: "booking",
        entityId: row.booking_id,
      });
      return;
    }

    if (match.status === "failed") {
      await updateNotificationLog(row.id, {
        status: "failed",
        external_error: match.external_error ?? null,
      });
      const ctx = await loadBookingContext(row.booking_id);
      if (ctx) {
        await alertForBooking(
          "verification_failed",
          ctx,
          `Mensagem enviada, mas a verificação de entrega retornou status "failed": ${match.external_error ?? "(sem detalhe)"}`
        );
      }
      return;
    }

    if (match.status === "delivered" || match.status === "read") {
      await updateNotificationLog(row.id, {
        status: "delivered",
        delivered_at: new Date().toISOString(),
      });
    }
    // Still "sent" at check time: WhatsApp just hasn't confirmed delivery yet.
    // No further polling is scheduled — leave as-is.
  } catch (err) {
    await logError({
      scope: "whatsapp",
      message: "verifyDelivery: unexpected error",
      metadata: { notificationLogId, error: String(err) },
    });
  }
}
