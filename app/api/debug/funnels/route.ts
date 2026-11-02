import { NextRequest, NextResponse } from "next/server";
import { nextalkGet } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — confirming the live funnel stage names/labels. Remove after use. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await nextalkGet<unknown>("/funnels");
  return NextResponse.json({ raw });
}
