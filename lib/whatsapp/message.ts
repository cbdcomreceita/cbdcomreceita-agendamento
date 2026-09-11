import { nextalkPostCreate } from "./nextalk-client";
import type { NextalkMessageResponse } from "./types";
import type { TemplateInput } from "./template";
import { buildContent, buildTemplateParams } from "./template";

/**
 * Passo 4 — sends the confirmation template. Always includes
 * template_params (never a bare text message) since this is a proactive
 * send that may land outside the 24h customer-service window.
 */
export async function sendConfirmationMessage(
  conversationDisplayId: number,
  input: TemplateInput
): Promise<NextalkMessageResponse> {
  return nextalkPostCreate<NextalkMessageResponse>(
    `/conversations/${conversationDisplayId}/messages`,
    {
      content: buildContent(input),
      message_type: "outgoing",
      private: false,
      template_params: buildTemplateParams(input),
    }
  );
}
