import { NextRequest, NextResponse } from "next/server";

/**
 * Temporary, one-off route to revert kanban card 1845 back to "prospeccao"
 * after tonight's Cenário B test moved it to "pagto_consulta" — uses the
 * real NEXTALK_API_TOKEN from this deployment's own runtime (never exposed
 * to the caller). Delete after use.
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

  const { NEXTALK_BASE_URL, getNextalkToken } = await import("@/lib/whatsapp/config");
  const token = getNextalkToken();
  if (!token) {
    return NextResponse.json({ error: "NEXTALK_API_TOKEN not set in this runtime" }, { status: 500 });
  }
  const headers = { api_access_token: token, "Content-Type": "application/json" };
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const cardId = url.searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json({ error: "missing cardId" }, { status: 400 });
  }

  if (action === "move") {
    const stage = url.searchParams.get("stage");
    if (!stage) return NextResponse.json({ error: "missing stage" }, { status: 400 });
    const res = await fetch(`${NEXTALK_BASE_URL}/kanban_items/${cardId}/move_to_stage`, {
      method: "POST",
      headers,
      body: JSON.stringify({ funnel_stage: stage, funnel_id: 1 }),
    });
    const body = await res.json();
    return NextResponse.json({ status: res.status, body });
  }

  // default: GET the card
  const res = await fetch(`${NEXTALK_BASE_URL}/kanban_items/${cardId}`, { headers });
  const body = await res.json();
  return NextResponse.json({ status: res.status, body });
}
