"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface BookingSummary {
  scheduledAt: string;
  scheduledEndAt: string;
  meetLink: string | null;
  status: string;
  doctorName: string | null;
}

/**
 * Read-only fetch of a booking's display fields by its UUID.
 *
 * Used by /confirmacao to refresh meet_link from the database after the
 * polling redirect. Without this, the GCal "Adicionar" button can show
 * up without the Meet link if sessionStorage didn't get updated (for
 * example, if the webhook beat the polling and the polling response
 * carried alreadyProcessed=true but with stale state).
 *
 * Uses the service role client so RLS doesn't block the read.
 */
export async function getBookingSummary(
  bookingId: string
): Promise<BookingSummary | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("scheduled_at, scheduled_end_at, meet_link, status, doctors(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;

  // Supabase returns the FK-related row as either an object or an array
  // depending on the schema metadata. Normalize to a plain object.
  const doctorRaw = data.doctors as unknown;
  const doctor = Array.isArray(doctorRaw)
    ? (doctorRaw[0] as { name?: string } | undefined)
    : (doctorRaw as { name?: string } | null);

  return {
    scheduledAt: data.scheduled_at as string,
    scheduledEndAt: data.scheduled_end_at as string,
    meetLink: (data.meet_link as string | null) ?? null,
    status: data.status as string,
    doctorName: doctor?.name ?? null,
  };
}
