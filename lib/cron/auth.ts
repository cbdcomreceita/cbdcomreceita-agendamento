import type { NextRequest } from "next/server";

/**
 * Shared by every /api/cron/* route — same CRON_SECRET, same Bearer check.
 * Extracted out of funnel/route.ts so /api/cron/health can reuse it
 * exactly instead of drifting out of sync with a second copy.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
