"use server";

import { logError } from "@/lib/audit/log-error";

/**
 * Posts a row of data to a Google Sheets webhook (typically a Google Apps
 * Script Web App with doPost() that appends to the active sheet).
 *
 * The body is a JSON object with all fields. Field order in the sheet is
 * controlled by the Apps Script side.
 *
 * If GOOGLE_SHEETS_WEBHOOK_URL is not set, logs and skips silently.
 * Failures are logged but never thrown — never block the booking flow.
 */
export async function appendToGoogleSheet(
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    console.warn("[Sheets] GOOGLE_SHEETS_WEBHOOK_URL not set — skipping");
    return { success: true };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      await logError({
        scope: "sheets",
        message: `Webhook returned ${res.status}`,
        metadata: { status: res.status, body: body.slice(0, 500), payload: data },
      });
      return { success: false, error: `${res.status}: ${body.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    await logError({
      scope: "sheets",
      message: "Webhook POST threw",
      metadata: { error: String(err), payload: data },
    });
    return { success: false, error: String(err) };
  }
}
