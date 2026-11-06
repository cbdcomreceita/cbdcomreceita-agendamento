import { nextalkPostCreate } from "./nextalk-client";
import { readNumericField, unwrapNextalkObject } from "./nextalk-response";
import type { TemplateInput } from "./template";
import { buildContent, buildTemplateParams } from "./template";
import type { PixReminderTemplateInput } from "./pix-reminder-template";
import { buildPixReminderContent, buildPixReminderTemplateParams } from "./pix-reminder-template";
import type { IntakeReminderTemplateInput } from "./intake-reminder-template";
import { buildIntakeReminderContent, buildIntakeReminderTemplateParams } from "./intake-reminder-template";
import type { ConfirmationV2TemplateInput } from "./confirmation-v2-template";
import { buildConfirmationV2Content, buildConfirmationV2TemplateParams } from "./confirmation-v2-template";

export interface SendMessageResult {
  id: number;
  status: string;
  external_error: string | null;
}

/**
 * Passo 4 — sends the confirmation template. Always includes
 * template_params (never a bare text message) since this is a proactive
 * send that may land outside the 24h customer-service window.
 *
 * Response is read tolerantly (bare object, or wrapped in `payload`/`data`)
 * via nextalk-response.ts, same as the conversation-creation step — this
 * endpoint's real shape on this account hasn't been proven to match the
 * PDF's bare-object example, so we don't assume it does.
 */
export async function sendConfirmationMessage(
  conversationDisplayId: number,
  input: TemplateInput
): Promise<SendMessageResult> {
  const raw = await nextalkPostCreate<unknown>(`/conversations/${conversationDisplayId}/messages`, {
    content: buildContent(input),
    message_type: "outgoing",
    private: false,
    template_params: buildTemplateParams(input),
  });
  const context = "POST /conversations/{id}/messages";
  const obj = unwrapNextalkObject(raw, "id", context);
  const id = readNumericField(obj, "id", context, raw);
  const status = typeof obj.status === "string" ? obj.status : "sent";
  const external_error = typeof obj.external_error === "string" ? obj.external_error : null;
  return { id, status, external_error };
}

/** Same shape as sendConfirmationMessage, for confirmacao_consulta_v2 (intake_required=true) instead. */
export async function sendConfirmationV2Message(
  conversationDisplayId: number,
  input: ConfirmationV2TemplateInput
): Promise<SendMessageResult> {
  const raw = await nextalkPostCreate<unknown>(`/conversations/${conversationDisplayId}/messages`, {
    content: buildConfirmationV2Content(input),
    message_type: "outgoing",
    private: false,
    template_params: buildConfirmationV2TemplateParams(input),
  });
  const context = "POST /conversations/{id}/messages (confirmacao_consulta_v2)";
  const obj = unwrapNextalkObject(raw, "id", context);
  const id = readNumericField(obj, "id", context, raw);
  const status = typeof obj.status === "string" ? obj.status : "sent";
  const external_error = typeof obj.external_error === "string" ? obj.external_error : null;
  return { id, status, external_error };
}

/** Same shape as sendConfirmationMessage, for the pix_pendente template instead. */
export async function sendPixReminderMessage(
  conversationDisplayId: number,
  input: PixReminderTemplateInput
): Promise<SendMessageResult> {
  const raw = await nextalkPostCreate<unknown>(`/conversations/${conversationDisplayId}/messages`, {
    content: buildPixReminderContent(input),
    message_type: "outgoing",
    private: false,
    template_params: buildPixReminderTemplateParams(input),
  });
  const context = "POST /conversations/{id}/messages (pix_pendente)";
  const obj = unwrapNextalkObject(raw, "id", context);
  const id = readNumericField(obj, "id", context, raw);
  const status = typeof obj.status === "string" ? obj.status : "sent";
  const external_error = typeof obj.external_error === "string" ? obj.external_error : null;
  return { id, status, external_error };
}

/** Same shape as sendConfirmationMessage, for lembrete_prontuario_12h instead. */
export async function sendIntakeReminderMessage(
  conversationDisplayId: number,
  input: IntakeReminderTemplateInput
): Promise<SendMessageResult> {
  const raw = await nextalkPostCreate<unknown>(`/conversations/${conversationDisplayId}/messages`, {
    content: buildIntakeReminderContent(input),
    message_type: "outgoing",
    private: false,
    template_params: buildIntakeReminderTemplateParams(input),
  });
  const context = "POST /conversations/{id}/messages (lembrete_prontuario_12h)";
  const obj = unwrapNextalkObject(raw, "id", context);
  const id = readNumericField(obj, "id", context, raw);
  const status = typeof obj.status === "string" ? obj.status : "sent";
  const external_error = typeof obj.external_error === "string" ? obj.external_error : null;
  return { id, status, external_error };
}
