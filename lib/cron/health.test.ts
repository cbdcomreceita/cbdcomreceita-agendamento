import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CRON_HEALTH_ALERT_SENT_EVENT,
  CRON_HEARTBEAT_EVENT,
  getCronHealth,
  getCronHealthMaxAgeMinutes,
  recordHealthAlertSent,
  recordHeartbeat,
  shouldSendHealthAlert,
} from "./health";

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeSupabase(row: { created_at: string } | null) {
  const insert = vi.fn(async (..._args: unknown[]) => ({ data: null, error: null }));
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    insert,
  };
  return { from: vi.fn(() => chain), insert, chain };
}

describe("getCronHealthMaxAgeMinutes", () => {
  it("defaults to 15 when unset", () => {
    vi.stubEnv("CRON_HEALTH_MAX_AGE_MINUTES", "");
    expect(getCronHealthMaxAgeMinutes()).toBe(15);
  });

  it("uses a valid configured value", () => {
    vi.stubEnv("CRON_HEALTH_MAX_AGE_MINUTES", "30");
    expect(getCronHealthMaxAgeMinutes()).toBe(30);
  });

  it("falls back to the default for a non-numeric or non-positive value", () => {
    vi.stubEnv("CRON_HEALTH_MAX_AGE_MINUTES", "not-a-number");
    expect(getCronHealthMaxAgeMinutes()).toBe(15);
    vi.stubEnv("CRON_HEALTH_MAX_AGE_MINUTES", "-5");
    expect(getCronHealthMaxAgeMinutes()).toBe(15);
  });
});

describe("getCronHealth", () => {
  it("is unhealthy with no heartbeat at all", async () => {
    const supabase = makeSupabase(null);
    const status = await getCronHealth(supabase);
    expect(status).toEqual({ healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes: 15 });
  });

  it("is healthy when the latest heartbeat is within the threshold", async () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const supabase = makeSupabase({ created_at: recent });
    const status = await getCronHealth(supabase);
    expect(status.healthy).toBe(true);
    expect(status.lastHeartbeatAt).toBe(recent);
  });

  it("is unhealthy when the latest heartbeat is older than the threshold", async () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const supabase = makeSupabase({ created_at: old });
    const status = await getCronHealth(supabase);
    expect(status.healthy).toBe(false);
    expect(status.ageMinutes).toBeGreaterThanOrEqual(20);
  });

  it("queries only cron_heartbeat events, most recent first", async () => {
    const supabase = makeSupabase(null);
    await getCronHealth(supabase);
    expect(supabase.chain.eq).toHaveBeenCalledWith("event_type", CRON_HEARTBEAT_EVENT);
    expect(supabase.chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});

describe("recordHeartbeat / recordHealthAlertSent", () => {
  it("inserts a cron_heartbeat audit event", async () => {
    const supabase = makeSupabase(null);
    await recordHeartbeat(supabase);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: CRON_HEARTBEAT_EVENT, entity_type: "cron" })
    );
  });

  it("inserts a cron_health_alert_sent audit event", async () => {
    const supabase = makeSupabase(null);
    await recordHealthAlertSent(supabase);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: CRON_HEALTH_ALERT_SENT_EVENT, entity_type: "cron" })
    );
  });
});

describe("shouldSendHealthAlert", () => {
  it("never sends while healthy", async () => {
    const supabase = makeSupabase(null);
    const healthy = { healthy: true, lastHeartbeatAt: new Date().toISOString(), ageMinutes: 1, maxAgeMinutes: 15 };
    expect(await shouldSendHealthAlert(supabase, healthy)) .toBe(false);
  });

  it("sends when unhealthy and no alert has ever been recorded", async () => {
    const supabase = makeSupabase(null); // no prior cron_health_alert_sent row
    const unhealthy = { healthy: false, lastHeartbeatAt: new Date(Date.now() - 30 * 60000).toISOString(), ageMinutes: 30, maxAgeMinutes: 15 };
    expect(await shouldSendHealthAlert(supabase, unhealthy)).toBe(true);
  });

  it("does not re-send when the last alert is newer than the last heartbeat (same streak)", async () => {
    const heartbeatAt = new Date(Date.now() - 30 * 60000);
    const alertAt = new Date(heartbeatAt.getTime() + 1000); // alert fired just after that heartbeat
    const supabase = makeSupabase({ created_at: alertAt.toISOString() });
    const unhealthy = { healthy: false, lastHeartbeatAt: heartbeatAt.toISOString(), ageMinutes: 30, maxAgeMinutes: 15 };
    expect(await shouldSendHealthAlert(supabase, unhealthy)).toBe(false);
  });

  it("sends again once a newer heartbeat arrived after the last alert (new incident)", async () => {
    const alertAt = new Date(Date.now() - 60 * 60000);
    const newerHeartbeat = new Date(Date.now() - 20 * 60000); // after the old alert
    const supabase = makeSupabase({ created_at: alertAt.toISOString() });
    const unhealthy = { healthy: false, lastHeartbeatAt: newerHeartbeat.toISOString(), ageMinutes: 20, maxAgeMinutes: 15 };
    expect(await shouldSendHealthAlert(supabase, unhealthy)).toBe(true);
  });

  it("does not re-send for the 'never had a heartbeat' case once already alerted once", async () => {
    const supabase = makeSupabase({ created_at: new Date().toISOString() }); // an alert was already sent
    const unhealthy = { healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes: 15 };
    expect(await shouldSendHealthAlert(supabase, unhealthy)).toBe(false);
  });
});
