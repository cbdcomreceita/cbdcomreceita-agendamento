import { logError } from "@/lib/audit/log-error";
import type { WhatsappAlertReason } from "@/lib/resend/send-whatsapp-alert";
import { alertForBooking as alert, loadBookingContext, type BookingContext } from "./booking-context";
import { getConfirmationMode, getDispatchMode, getTeamNumbers } from "./config";
import { NextalkApiError } from "./nextalk-client";
import { extractMeetCode, isValidMeetLink, normalizePhoneToVariants, type PhoneVariants } from "./phone";
import { findOrCreateContact, ensureContactInbox } from "./contact";
import { findOrCreateConversation } from "./conversation";
import { sendConfirmationMessage } from "./message";
import { upsertKanbanCard } from "./kanban";
import { reserveNotification, updateNotificationLog } from "./notification-log";
import { publishVerifyDelivery } from "./qstash";
import type { TemplateInput } from "./template";
import type { WhatsappNotificationRow } from "./types";

async function runKanbanStep(
  row: WhatsappNotificationRow,
  ctx: BookingContext,
  conversationDisplayId: number
): Promise<void> {
  try {
    const result = await upsertKanbanCard({
      patientFullName: ctx.patientFullName,
      dateBR: ctx.dateBR,
      timeH: ctx.timeH,
      doctorName: ctx.doctorName,
      conversationDisplayId,
      amountPaid: ctx.amountCents / 100,
    });
    await updateNotificationLog(row.id, {
      nextalk_kanban_card_id: String(result.cardId),
      nextalk_kanban_action: result.action,
    });
  } catch (err) {
    await alert("card_error", ctx, String(err));
  }
}

/**
 * Runs the full 5-step NexTalk flow (contact → inbox → conversation →
 * message → kanban) for a booking, or resumes it, per this strict contract:
 *
 *  - Fresh reservation (no prior row)         → run all 5 steps.
 *  - Prior row WITH nextalk_message_id        → message send is confirmed
 *                                                done; only resume the
 *                                                kanban step if missing.
 *  - Prior row WITHOUT nextalk_message_id     → the send outcome of the
 *                                                earlier attempt is
 *                                                ambiguous (could have
 *                                                reached WhatsApp before we
 *                                                crashed). NEVER retry —
 *                                                mark failed and alert.
 *
 * Isolation: every failure path here logs/alerts and returns normally.
 * This function must never throw — its caller (the API route) always
 * responds 200 to QStash so a transient NexTalk hiccup doesn't trigger a
 * redelivery that could duplicate a create-POST.
 */
export async function orchestrateConfirmation(bookingId: string): Promise<void> {
  let ctx: BookingContext | null = null;
  try {
    const mode = getConfirmationMode();
    if (mode === "off") return;

    ctx = await loadBookingContext(bookingId);
    if (!ctx) return;

    const variants: PhoneVariants | null = normalizePhoneToVariants(ctx.patientPhone);
    if (!variants) {
      await alert("invalid_phone", ctx, `Não foi possível normalizar "${ctx.patientPhone}" para E.164`);
      return;
    }

    if (!isValidMeetLink(ctx.meetLink)) {
      await alert("missing_meet_link", ctx, `Meet link ausente ou fora do formato esperado: ${ctx.meetLink ?? "(vazio)"}`);
      return;
    }

    const dispatchMode = getDispatchMode();

    if (mode === "team_only" && !getTeamNumbers().has(variants.primary)) {
      const { row, isNew } = await reserveNotification({
        bookingId,
        patientId: ctx.patientId,
        recipient: variants.primary,
        payload: { mode, dispatchMode, reason: "not_in_team_only_list" },
      });
      if (isNew) {
        await updateNotificationLog(row.id, { status: "skipped" });
      }
      return;
    }

    const { row, isNew } = await reserveNotification({
      bookingId,
      patientId: ctx.patientId,
      recipient: variants.primary,
      payload: { mode, dispatchMode },
    });

    if (!isNew) {
      if (row.status === "sent" || row.status === "delivered" || row.status === "skipped") {
        return;
      }
      if (!row.nextalk_message_id) {
        await updateNotificationLog(row.id, {
          status: "failed",
          error_message:
            "Linha já existia sem nextalk_message_id confirmado — reenvio bloqueado para evitar duplicidade.",
        });
        await alert(
          "send_failed",
          ctx,
          "Retomada bloqueada: uma linha de notificação já existia para este agendamento sem confirmação de envio. Verifique manualmente se a mensagem chegou antes de reenviar."
        );
        return;
      }
      if (!row.nextalk_kanban_card_id && row.nextalk_conversation_display_id) {
        await runKanbanStep(row, ctx, Number(row.nextalk_conversation_display_id));
      }
      return;
    }

    const meetCode = extractMeetCode(ctx.meetLink)!;

    let contactId: number;
    let conversationDisplayId: number;
    try {
      const contact = await findOrCreateContact(variants, ctx.patientFullName, ctx.patientEmail);
      contactId = contact.id;
      await updateNotificationLog(row.id, { nextalk_contact_id: String(contactId) });

      await ensureContactInbox(contactId);

      conversationDisplayId = await findOrCreateConversation(contactId, {
        bookingId,
        dateBR: ctx.dateBR,
        timeH: ctx.timeH,
        doctorName: ctx.doctorName,
        meetLink: ctx.meetLink!,
      });
      await updateNotificationLog(row.id, {
        nextalk_conversation_display_id: String(conversationDisplayId),
      });
    } catch (err) {
      await updateNotificationLog(row.id, { status: "failed", error_message: String(err) });
      const reason: WhatsappAlertReason =
        err instanceof NextalkApiError && err.status === 401 ? "auth_error" : "send_failed";
      await alert(reason, ctx, `Falha ao preparar contato/conversa no NexTalk: ${String(err)}`);
      return;
    }

    const templateInput: TemplateInput = {
      patientFullName: ctx.patientFullName,
      dateBR: ctx.dateBR,
      timeH: ctx.timeH,
      doctorName: ctx.doctorName,
      meetLink: ctx.meetLink!,
      meetCode,
    };

    let messageSentOk = false;
    try {
      const message = await sendConfirmationMessage(conversationDisplayId, templateInput);
      const failed = message.status === "failed";
      await updateNotificationLog(row.id, {
        nextalk_message_id: String(message.id),
        status: failed ? "failed" : "sent",
        external_error: message.external_error ?? null,
        sent_at: failed ? null : new Date().toISOString(),
      });
      if (failed) {
        await alert("send_failed", ctx, `NexTalk retornou status "failed": ${message.external_error ?? "(sem detalhe)"}`);
      } else {
        messageSentOk = true;
      }
    } catch (err) {
      await updateNotificationLog(row.id, { status: "failed", error_message: String(err) });
      const reason: WhatsappAlertReason =
        err instanceof NextalkApiError && err.status === 401 ? "auth_error" : "send_failed";
      await alert(reason, ctx, `Falha ao enviar mensagem pelo NexTalk: ${String(err)}`);
    }

    // Passo 5 runs regardless of message outcome, as long as a conversation exists.
    await runKanbanStep(row, ctx, conversationDisplayId);

    // Delivery verification is a QStash-scheduled job — in "inline" mode
    // there's no QStash to schedule it with, so we deliberately skip it
    // rather than erroring. dispatchMode is already recorded on the row
    // (payload above), so it's clear afterward which sends never got a
    // verification pass.
    if (messageSentOk && dispatchMode === "qstash") {
      await publishVerifyDelivery(row.id);
    }
  } catch (err) {
    if (ctx) {
      await alert("unexpected_error", ctx, String(err));
    } else {
      await logError({
        scope: "whatsapp",
        message: "orchestrateConfirmation: unexpected error before booking context loaded",
        metadata: { bookingId, error: String(err), stack: err instanceof Error ? err.stack : undefined },
        entityType: "booking",
        entityId: bookingId,
      });
    }
  }
}
