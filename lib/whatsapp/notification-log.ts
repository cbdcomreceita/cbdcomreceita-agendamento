import { createServiceClient } from "@/lib/supabase/server";
import { NEXTALK_TEMPLATE_NAME } from "./config";
import type { WhatsappNotificationRow } from "./types";

const UNIQUE_VIOLATION = "23505";

export interface ReserveInput {
  bookingId: string;
  patientId: string | null;
  recipient: string;
  payload: Record<string, unknown>;
}

export interface ReserveResult {
  row: WhatsappNotificationRow;
  /** false means a row for this booking already existed — caller must branch on its status. */
  isNew: boolean;
}

/**
 * Reserves this booking's WhatsApp-confirmation slot via a plain insert,
 * relying on the partial unique index on (booking_id, type) WHERE
 * channel='whatsapp' (migration 0011) to reject a second row. Deliberately
 * NOT using supabase-js `.upsert({onConflict})` — that requires a full
 * unique/exclusion constraint and doesn't support partial indexes.
 */
export async function reserveNotification(input: ReserveInput): Promise<ReserveResult> {
  const supabase = createServiceClient();

  const { data: inserted, error } = await supabase
    .from("notifications_log")
    .insert({
      booking_id: input.bookingId,
      patient_id: input.patientId,
      channel: "whatsapp",
      type: "booking_confirmation",
      status: "queued",
      recipient: input.recipient,
      template_name: NEXTALK_TEMPLATE_NAME,
      payload: input.payload,
    })
    .select()
    .single();

  if (!error) {
    return { row: inserted as WhatsappNotificationRow, isNew: true };
  }

  if (error.code !== UNIQUE_VIOLATION) {
    throw error;
  }

  const { data: existing, error: selectError } = await supabase
    .from("notifications_log")
    .select()
    .eq("booking_id", input.bookingId)
    .eq("channel", "whatsapp")
    .eq("type", "booking_confirmation")
    .single();

  if (selectError || !existing) {
    throw selectError ?? new Error("Reserved row not found after unique violation");
  }

  return { row: existing as WhatsappNotificationRow, isNew: false };
}

export async function updateNotificationLog(
  id: string,
  patch: Partial<WhatsappNotificationRow>
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("notifications_log").update(patch).eq("id", id);
  if (error) throw error;
}

export async function getNotificationLog(id: string): Promise<WhatsappNotificationRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("notifications_log").select().eq("id", id).single();
  return (data as WhatsappNotificationRow) ?? null;
}
