"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";
import {
  composeDispatchAlert,
  type ComposeDispatchAlertInput,
} from "./dispatch-alert-content";

export type { DispatchStep, DispatchFailure } from "./dispatch-alert-content";

/**
 * Team-facing alert for a failure inside dispatchPostPaymentSideEffects.
 * NEVER include symptoms, condition, or any other health data — only
 * booking logistics. Groups every failed step from a single run into one
 * e-mail — never one e-mail per step. Text composition lives in
 * dispatch-alert-content.ts (no "use server", so it can be unit-tested
 * directly without mocking Resend/Supabase).
 *
 * Always logs to audit_events first (one row per failure, done by the
 * caller before this runs), independent of whether Resend actually sends:
 * lib/resend/client.ts returns no-op when RESEND_API_KEY is missing, so
 * Resend's reported success is not proof an alert reached anyone.
 */
export async function sendDispatchAlert(input: ComposeDispatchAlertInput): Promise<void> {
  if (input.failures.length === 0) return;

  const { bookingId } = input;
  const { subject, body } = composeDispatchAlert(input);

  const alertEmail = process.env.WHATSAPP_ALERT_EMAIL;
  if (!alertEmail) {
    console.warn("[dispatch] WHATSAPP_ALERT_EMAIL not configured — skipping alert email");
    return;
  }

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping dispatch alert email (mock mode)");
    return;
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: alertEmail,
      subject,
      text: body,
    });
    if (error) {
      await logError({
        scope: "dispatch",
        message: "Dispatch alert email send error",
        metadata: { error, bookingId },
        entityType: "booking",
        entityId: bookingId,
      });
    }
  } catch (err) {
    await logError({
      scope: "dispatch",
      message: "Dispatch alert email threw",
      metadata: { error: String(err), bookingId },
      entityType: "booking",
      entityId: bookingId,
    });
  }
}
