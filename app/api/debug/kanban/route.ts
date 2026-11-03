import { NextRequest, NextResponse } from "next/server";
import { nextalkGet, nextalkPostCreate } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — inspecting + reverting live kanban cards before cleanup. Remove after use. */
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

/** Moves a kanban item back to a given stage — used once to revert card 1845 to prospeccao. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const itemId = req.nextUrl.searchParams.get("item");
  const stage = req.nextUrl.searchParams.get("stage");
  if (!itemId || !stage) return NextResponse.json({ error: "missing item or stage" }, { status: 400 });
  const raw = await nextalkPostCreate<unknown>(`/kanban_items/${itemId}/move_to_stage`, {
    funnel_stage: stage,
    funnel_id: 1,
  });
  return NextResponse.json({ raw });
}
