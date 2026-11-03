import { NextRequest, NextResponse } from "next/server";

/**
 * Temporary, one-off diagnostic route for tonight's Cenário B validation —
 * calls /api/cron/funnel 3x in a row using the real CRON_SECRET from this
 * deployment's own runtime (never exposed to the caller) and returns all 3
 * responses. Gated by DEBUG_TRIGGER_SECRET (not CRON_SECRET, which this
 * route exists to avoid needing client-side). Delete after use.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.DEBUG_TRIGGER_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set in this runtime" }, { status: 500 });
  }

  const baseUrl = new URL(req.url).origin;
  const results = [];
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${baseUrl}/api/cron/funnel`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const body = await res.json();
    results.push({ call: i + 1, status: res.status, body });
  }

  return NextResponse.json({ results });
}
