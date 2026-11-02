import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyDelivery } from "@/lib/whatsapp/verify-delivery";

/**
 * TEMPORARY — investigating a non-delivered pix_pendente reminder.
 * Reuses the existing, already-tested verifyDelivery (only acts on rows
 * still status='sent', never resends) to pull the real NexTalk message
 * status via GET /conversations/{id}/messages. Remove after use.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: before } = await supabase.from("notifications_log").select("*").eq("id", id).maybeSingle();

  await verifyDelivery(id);

  const { data: after } = await supabase.from("notifications_log").select("*").eq("id", id).maybeSingle();

  return NextResponse.json({ before, after });
}
