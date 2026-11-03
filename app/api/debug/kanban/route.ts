import { NextRequest, NextResponse } from "next/server";
import { nextalkGet } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — inspecting live kanban cards before cleanup. Remove after use. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversation = req.nextUrl.searchParams.get("conversation");
  const itemId = req.nextUrl.searchParams.get("item");
  if (itemId) {
    const raw = await nextalkGet<unknown>(`/kanban_items/${itemId}`);
    return NextResponse.json({ raw });
  }
  if (!conversation) return NextResponse.json({ error: "missing conversation or item" }, { status: 400 });
  const raw = await nextalkGet<unknown>(`/kanban_items?conversation=${conversation}`);
  return NextResponse.json({ raw });
}
