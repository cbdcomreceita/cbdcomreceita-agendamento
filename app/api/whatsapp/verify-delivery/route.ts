import { NextRequest, NextResponse } from "next/server";
import { VERIFY_DELIVERY_PATH, verifyQstashSignature } from "@/lib/whatsapp/qstash";
import { verifyDelivery } from "@/lib/whatsapp/verify-delivery";
import { logError } from "@/lib/audit/log-error";

/**
 * QStash-triggered. Unlike send-confirmation, this is read-only and
 * idempotent-safe — a QStash retry just re-checks the same message, so
 * normal error-code semantics are fine here (no need to force 200).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Upstash-Signature");

  const valid = await verifyQstashSignature(signature, body, VERIFY_DELIVERY_PATH);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let notificationLogId: string | undefined;
  try {
    const parsed = JSON.parse(body) as { notificationLogId?: string };
    notificationLogId = parsed.notificationLogId;
  } catch (err) {
    await logError({ scope: "whatsapp", message: "verify-delivery: invalid JSON body", metadata: { body, error: String(err) } });
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!notificationLogId) {
    return NextResponse.json({ error: "Missing notificationLogId" }, { status: 400 });
  }

  await verifyDelivery(notificationLogId);

  return NextResponse.json({ success: true });
}
