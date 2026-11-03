import { NextRequest, NextResponse } from "next/server";
import { nextalkGet } from "@/lib/whatsapp/nextalk-client";

/** TEMPORARY — checking pix_pendente2's Meta approval status + button URL. Remove after use. */
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
