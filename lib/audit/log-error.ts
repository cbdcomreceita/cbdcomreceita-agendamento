"use server";

import { createServiceClient } from "@/lib/supabase/server";

export type ErrorScope =
  | "calcom"
  | "confirm"
  | "create"
  | "resend"
  | "sheets"
  | "simulate"
  | "webhook";

export interface LogErrorParams {
  scope: ErrorScope;
  /** Short description of what failed. */
  message: string;
  /** Free-form context — request body, response body, IDs, etc. */
  metadata?: Record<string, unknown>;
  /** Optional entity_type override (defaults to scope). */
  entityType?: string;
  /** Booking/patient/payment UUID, when relevant. */
  entityId?: string | null;
}

/**
 * Persist an error to the audit_events table so we can debug post-hoc
 * even without Vercel logs. Always non-throwing — the helper itself
 * catches and console.errors any failure rather than letting a logging
 * problem cascade into the caller.
 */
export async function logError(params: LogErrorParams): Promise<void> {
  // Always console.error too, so live tailing still works.
  console.error(
    `[${params.scope}] ${params.message}`,
    params.metadata ? JSON.stringify(params.metadata) : ""
  );

  try {
    const supabase = createServiceClient();
    await supabase.from("audit_events").insert({
      event_type: "error",
      entity_type: params.entityType ?? params.scope,
      entity_id: params.entityId ?? null,
      metadata: {
        scope: params.scope,
        message: params.message,
        ...(params.metadata ?? {}),
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write error to audit_events:", err);
  }
}
