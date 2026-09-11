import { NextRequest, NextResponse } from "next/server";
import { SEND_CONFIRMATION_PATH, verifyQstashSignature } from "@/lib/whatsapp/qstash";
import { orchestrateConfirmation } from "@/lib/whatsapp/orchestrate-confirmation";
import { logError } from "@/lib/audit/log-error";

/**
 * QStash-triggered. Always responds 200 for any outcome other than a bad
 * signature — orchestrateConfirmation never throws and handles its own
 * failure logging/alerting internally, so a 200 here just means "the job
 * ran," not "the WhatsApp message was sent." Returning a non-2xx for a
 * NexTalk-side failure would make QStash redeliver, which could duplicate
 * a create-POST (contact/conversation/message/card) — exactly what the
 * per-step resumability contract in orchestrate-confirmation.ts is
 * designed to avoid needing.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Upstash-Signature");

  const valid = await verifyQstashSignature(signature, body, SEND_CONFIRMATION_PATH);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let bookingId: string | undefined;
  try {
    const parsed = JSON.parse(body) as { bookingId?: string };
    bookingId = parsed.bookingId;
  } catch (err) {
    await logError({ scope: "whatsapp", message: "send-confirmation: invalid JSON body", metadata: { body, error: String(err) } });
    return NextResponse.json({ success: true });
  }

  if (!bookingId) {
    await logError({ scope: "whatsapp", message: "send-confirmation: missing bookingId", metadata: { body } });
    return NextResponse.json({ success: true });
  }

  await orchestrateConfirmation(bookingId);

  return NextResponse.json({ success: true });
}
