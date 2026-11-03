"use server";

import { appendToGoogleSheet } from "./append-row";

/**
 * Entrega 2 — "updates" the Sheets row for a booking once the prontuário
 * (RG, nascimento, endereço) is completed, by Booking ID.
 *
 * The Apps Script webhook currently deployed only supports doPost(append) —
 * updating an existing row by Booking ID requires the new script in
 * scratchpad/google-apps-script-update-by-booking-id.gs to be pasted into
 * the project and republished (can't be done from here — no Apps Script
 * deploy API access). Until that happens, this call reaches the SAME
 * append-only webhook, so it lands as a new row rather than an in-place
 * update — "Tipo" below marks it clearly so the team can reconcile by
 * "Booking ID" manually in the meantime.
 */
export async function updateGoogleSheetRow(
  bookingId: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  return appendToGoogleSheet({
    Tipo: "Atualização (prontuário preenchido)",
    "Booking ID": bookingId,
    ...data,
  });
}
