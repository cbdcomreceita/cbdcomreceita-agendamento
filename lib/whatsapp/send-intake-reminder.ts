import { logError } from "@/lib/audit/log-error";
import { findOrCreateContact, ensureContactInbox } from "./contact";
import { findOrCreateConversation } from "./conversation";
import { sendIntakeReminderMessage } from "./message";
import { reserveNotification, updateNotificationLog } from "./notification-log";
import { normalizePhoneToVariants } from "./phone";
import type { IntakeReminderTemplateInput } from "./intake-reminder-template";
import { getIntakeReminderTemplateName } from "./config";

export interface SendIntakeReminderInput {
  bookingId: string;
  patientId: string;
  patientFullName: string;
  patientPhone: string;
  doctorName: string;
  dateLabel: string;
  timeH: string;
  intakeDeadline: string;
  intakeToken: string;
}

export type SendIntakeReminderResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Sends the lembrete_prontuario_12h template — same contact → inbox →
 * conversation → message chain as sendPixReminder, minus the kanban step
 * (not part of this reminder's scope per the spec).
 *
 * Idempotency for a single booking_id is handled by reserveNotification's
 * unique index (booking_id, type='intake_reminder_12h').
 */
export async function sendIntakeReminder(
  input: SendIntakeReminderInput
): Promise<SendIntakeReminderResult> {
  const variants = normalizePhoneToVariants(input.patientPhone);
  if (!variants) {
    await logError({
      scope: "whatsapp",
      message: "sendIntakeReminder: could not normalize phone to E.164",
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
    type: "intake_reminder_12h",
    templateName: getIntakeReminderTemplateName(),
    payload: { intakeToken: input.intakeToken },
  });

  if (!isNew) {
    return { status: "skipped", reason: `already_reserved:${row.status}` };
  }

  const templateInput: IntakeReminderTemplateInput = {
    patientFullName: input.patientFullName,
    doctorName: input.doctorName,
    dateLabel: input.dateLabel,
    timeH: input.timeH,
    intakeDeadline: input.intakeDeadline,
    intakeToken: input.intakeToken,
  };

  try {
    const { contact } = await findOrCreateContact(variants, input.patientFullName, null);
    await updateNotificationLog(row.id, { nextalk_contact_id: String(contact.id) });

    await ensureContactInbox(contact.id);

    const { displayId } = await findOrCreateConversation(contact.id, {
      bookingId: input.bookingId,
      dateBR: input.dateLabel,
      timeH: input.timeH,
      doctorName: input.doctorName,
    });
    await updateNotificationLog(row.id, { nextalk_conversation_display_id: String(displayId) });

    const message = await sendIntakeReminderMessage(displayId, templateInput);
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
    return { status: "sent" };
  } catch (err) {
    await updateNotificationLog(row.id, {
      status: "failed",
      error_message: String(err),
      external_error: String(err),
    });
    await logError({
      scope: "whatsapp",
      message: "sendIntakeReminder: unexpected error",
      metadata: { error: String(err), bookingId: input.bookingId },
      entityType: "booking",
      entityId: input.bookingId,
    });
    return { status: "failed", error: String(err) };
  }
}
