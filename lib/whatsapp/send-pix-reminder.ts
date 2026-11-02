import { logError } from "@/lib/audit/log-error";
import { findOrCreateContact, ensureContactInbox } from "./contact";
import { findOrCreateConversation } from "./conversation";
import { sendPixReminderMessage } from "./message";
import { reserveNotification, updateNotificationLog } from "./notification-log";
import { normalizePhoneToVariants } from "./phone";
import { PIX_REMINDER_TEMPLATE_NAME } from "./pix-reminder-template";
import type { PixReminderTemplateInput } from "./pix-reminder-template";
import { publishVerifyDelivery } from "./qstash";

export interface SendPixReminderInput {
  bookingId: string;
  patientId: string;
  patientFullName: string;
  patientPhone: string;
  patientEmail: string | null;
  doctorName: string;
  dateBR: string;
  dateLabel: string;
  timeH: string;
  expirationTimeH: string;
  paymentToken: string;
}

export type SendPixReminderResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Sends the pix_pendente WhatsApp template — the same contact → inbox →
 * conversation → message chain as orchestrateConfirmation, minus the
 * kanban step (not part of this reminder's scope) and minus meetLink
 * (doesn't exist yet at this point in the funnel).
 *
 * Idempotency for a single booking_id is handled by reserveNotification's
 * unique index (booking_id, type='payment_pending'). Idempotency across
 * booking_id for the same patient+scheduled_at (per product decision —
 * old orphaned bookings for the same slot shouldn't each trigger their own
 * reminder) is the CALLER's responsibility — see app/api/cron/funnel.
 */
export async function sendPixReminder(input: SendPixReminderInput): Promise<SendPixReminderResult> {
  const variants = normalizePhoneToVariants(input.patientPhone);
  if (!variants) {
    await logError({
      scope: "whatsapp",
      message: "sendPixReminder: could not normalize phone to E.164",
      metadata: { bookingId: input.bookingId, patientPhone: input.patientPhone },
      entityType: "booking",
      entityId: input.bookingId,
    });
    return { status: "failed", error: "invalid_phone" };
  }

  const { row, isNew } = await reserveNotification({
    bookingId: input.bookingId,
    patientId: input.patientId,
    recipient: variants.primary,
    type: "payment_pending",
    templateName: PIX_REMINDER_TEMPLATE_NAME,
    payload: { paymentToken: input.paymentToken },
  });

  if (!isNew) {
    // Already reserved for this booking_id — reported as "skipped" so the
    // caller doesn't double-count it as a send or a failure.
    return { status: "skipped", reason: `already_reserved:${row.status}` };
  }

  const templateInput: PixReminderTemplateInput = {
    patientFullName: input.patientFullName,
    doctorName: input.doctorName,
    dateLabel: input.dateLabel,
    timeH: input.timeH,
    expirationTimeH: input.expirationTimeH,
    paymentToken: input.paymentToken,
  };

  try {
    const providerResponse: Record<string, unknown> = {};

    const { contact, createRaw: contactRaw } = await findOrCreateContact(
      variants,
      input.patientFullName,
      input.patientEmail
    );
    if (contactRaw !== null) providerResponse.contact_create = contactRaw;
    await updateNotificationLog(row.id, {
      nextalk_contact_id: String(contact.id),
      ...(contactRaw !== null ? { provider_response: providerResponse } : {}),
    });

    await ensureContactInbox(contact.id);

    const { displayId, createRaw: conversationRaw } = await findOrCreateConversation(contact.id, {
      bookingId: input.bookingId,
      dateBR: input.dateBR,
      timeH: input.timeH,
      doctorName: input.doctorName,
    });
    if (conversationRaw !== null) providerResponse.conversation_create = conversationRaw;
    await updateNotificationLog(row.id, {
      nextalk_conversation_display_id: String(displayId),
      ...(conversationRaw !== null ? { provider_response: providerResponse } : {}),
    });

    const message = await sendPixReminderMessage(displayId, templateInput);
    const failed = message.status === "failed";
    await updateNotificationLog(row.id, {
      nextalk_message_id: String(message.id),
      status: failed ? "failed" : "sent",
      external_error: message.external_error ?? null,
      sent_at: failed ? null : new Date().toISOString(),
    });

    if (failed) {
      return { status: "failed", error: message.external_error ?? "NexTalk retornou status failed" };
    }

    // NexTalk's synchronous response here only confirms it accepted the
    // send — Meta's actual accept/reject (e.g. the #132000 param-count
    // rejection found in production on 2026-11-02) arrives later and never
    // reaches us unless something polls for it. Same follow-up
    // orchestrateConfirmation already schedules for confirmacao_consulta;
    // skipped only if QStash isn't configured (e.g. local/preview without
    // those env vars) — never fails the send itself over this.
    try {
      await publishVerifyDelivery(row.id);
    } catch (err) {
      await logError({
        scope: "whatsapp",
        message: "sendPixReminder: failed to schedule delivery verification",
        metadata: { error: String(err), bookingId: input.bookingId, notificationLogId: row.id },
        entityType: "booking",
        entityId: input.bookingId,
      });
    }

    return { status: "sent" };
  } catch (err) {
    await updateNotificationLog(row.id, {
      status: "failed",
      error_message: String(err),
      external_error: String(err),
    });
    await logError({
      scope: "whatsapp",
      message: "sendPixReminder: unexpected error",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
    return { status: "failed", error: String(err) };
  }
}
