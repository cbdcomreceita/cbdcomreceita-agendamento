import { NextRequest, NextResponse } from "next/server";
import { nextalkGet, nextalkPostCreate } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — checking pix_pendente2's Meta approval status + button URL, with an optional sync trigger. Remove after use. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await nextalkGet<{ templates: unknown[] }>("/inboxes/13/whatsapp_templates");
  const all = raw.templates as Array<{ name: string }>;
  const match = all.find((t) => t.name === "pix_pendente2" || t.name === "pix_pendente");
  return NextResponse.json({ found: all.map((t) => t.name), match });
}

/** Tries a sync endpoint if one exists. Returns its raw response or the error if it doesn't. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const raw = await nextalkPostCreate<unknown>("/inboxes/13/whatsapp_templates/sync", {});
    return NextResponse.json({ raw });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 200 });
  }
}
