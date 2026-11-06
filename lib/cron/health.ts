/**
 * Health tracking for /api/cron/funnel — born from a real incident: the
 * funnel cron ran with a stale CRON_SECRET for 2 hours after a rotation
 * (pg_cron's stored job command still had the old password) and nobody
 * noticed, because a route that's rejecting its own calls with 401 has no
 * way to raise its own alarm. The signal has to come from outside it.
 *
 * Approach: funnel's GET handler writes an unconditional "heartbeat" audit
 * event on every successful (authorized) run, regardless of whether there
 * was any actual work to do that tick. /api/cron/health — a separate
 * route, polled independently (see the pg_cron job described in the PR) —
 * just checks how old the latest heartbeat is. If the funnel route starts
 * 401ing again, no new heartbeats land, and health flips unhealthy within
 * one polling cycle.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export const CRON_HEARTBEAT_EVENT = "cron_heartbeat";
export const CRON_HEALTH_ALERT_SENT_EVENT = "cron_health_alert_sent";

const DEFAULT_MAX_AGE_MINUTES = 15;

/** Configurable so the threshold can be loosened/tightened without a deploy. Default 15min = 3x the funnel cron's 5min interval. */
export function getCronHealthMaxAgeMinutes(): number {
  const raw = Number(process.env.CRON_HEALTH_MAX_AGE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_AGE_MINUTES;
}

export interface CronHealthStatus {
  healthy: boolean;
  lastHeartbeatAt: string | null;
  ageMinutes: number | null;
  maxAgeMinutes: number;
}

/** Called once per successful funnel tick — right after auth passes, before any of the tick's actual work. */
export async function recordHeartbeat(supabase: SupabaseAny): Promise<void> {
  await supabase.from("audit_events").insert({
    event_type: CRON_HEARTBEAT_EVENT,
    entity_type: "cron",
    metadata: {},
  });
}

export async function getCronHealth(supabase: SupabaseAny): Promise<CronHealthStatus> {
  const maxAgeMinutes = getCronHealthMaxAgeMinutes();
  const { data } = await supabase
    .from("audit_events")
    .select("created_at")
    .eq("event_type", CRON_HEARTBEAT_EVENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes };
  }

  const ageMinutes = Math.round((Date.now() - new Date(data.created_at).getTime()) / 60000);
  return {
    healthy: ageMinutes <= maxAgeMinutes,
    lastHeartbeatAt: data.created_at,
    ageMinutes,
    maxAgeMinutes,
  };
}

/**
 * At most one alert e-mail per unhealthy streak: true only if no alert has
 * been recorded since the last known heartbeat. Once a fresh heartbeat
 * arrives (recovery), the next incident gets its own alert again. If
 * there has NEVER been a heartbeat at all (lastHeartbeatAt null — e.g.
 * right after this ships, before the first funnel tick), alerts once and
 * then waits for an actual heartbeat before it will alert again, so a
 * slow first boot can't spam the inbox every polling cycle.
 */
export async function shouldSendHealthAlert(supabase: SupabaseAny, status: CronHealthStatus): Promise<boolean> {
  if (status.healthy) return false;

  const { data } = await supabase
    .from("audit_events")
    .select("created_at")
    .eq("event_type", CRON_HEALTH_ALERT_SENT_EVENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true;
  if (!status.lastHeartbeatAt) return false;
  return new Date(data.created_at).getTime() <= new Date(status.lastHeartbeatAt).getTime();
}

export async function recordHealthAlertSent(supabase: SupabaseAny): Promise<void> {
  await supabase.from("audit_events").insert({
    event_type: CRON_HEALTH_ALERT_SENT_EVENT,
    entity_type: "cron",
    metadata: {},
  });
}
