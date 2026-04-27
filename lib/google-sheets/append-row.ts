"use server";

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
      console.error("[Sheets] Webhook error:", res.status, body);
      return { success: false, error: `${res.status}: ${body.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[Sheets] Failed to post:", err);
    return { success: false, error: String(err) };
  }
}
