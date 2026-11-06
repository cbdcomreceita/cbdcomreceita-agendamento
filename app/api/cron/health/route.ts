import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { getCronHealth, shouldSendHealthAlert, recordHealthAlertSent } from "@/lib/cron/health";
import { isCronHealthAlertEnabled } from "@/app/actions/feature-flags";
import { sendCronHealthAlert } from "@/lib/resend/send-cron-health-alert";

/**
 * Polled independently of /api/cron/funnel (see the pg_cron job added
 * alongside this route) so a stale CRON_SECRET or a dead funnel route
 * still gets noticed — see lib/cron/health.ts for the full story.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const status = await getCronHealth(supabase);

  if (!status.healthy && (await isCronHealthAlertEnabled())) {
    if (await shouldSendHealthAlert(supabase, status)) {
      await sendCronHealthAlert(status);
      await recordHealthAlertSent(supabase);
    }
  }

  return NextResponse.json(status, { status: status.healthy ? 200 : 503 });
}
