import { NextRequest, NextResponse } from "next/server";
import { nextalkGet } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — confirming how pix_pendente's button URL is registered. Remove after use. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await nextalkGet<unknown>("/inboxes/13/whatsapp_templates");
  return NextResponse.json({ raw });
}
