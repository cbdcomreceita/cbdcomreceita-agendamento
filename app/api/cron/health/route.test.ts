import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({}) }));

const getCronHealth = vi.fn();
const shouldSendHealthAlert = vi.fn();
const recordHealthAlertSent = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/cron/health", () => ({
  getCronHealth: (...a: unknown[]) => getCronHealth(...a),
  shouldSendHealthAlert: (...a: unknown[]) => shouldSendHealthAlert(...a),
  recordHealthAlertSent: (...a: unknown[]) => recordHealthAlertSent(...a),
}));

const isCronHealthAlertEnabled = vi.fn(async () => false);
vi.mock("@/app/actions/feature-flags", () => ({
  isCronHealthAlertEnabled: () => isCronHealthAlertEnabled(),
}));

const sendCronHealthAlert = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/resend/send-cron-health-alert", () => ({
  sendCronHealthAlert: (...a: unknown[]) => sendCronHealthAlert(...a),
}));

const { GET } = await import("./route");

function makeRequest(authHeader: string | null) {
  const headers: Record<string, string> = {};
  if (authHeader !== null) headers["authorization"] = authHeader;
  return new NextRequest("http://localhost/api/cron/health", { headers });
}

beforeEach(() => {
  getCronHealth.mockReset();
  shouldSendHealthAlert.mockReset();
  recordHealthAlertSent.mockClear();
  sendCronHealthAlert.mockClear();
  isCronHealthAlertEnabled.mockReset().mockResolvedValue(false);
  vi.stubEnv("CRON_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/health", () => {
  it("rejects without the right bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(getCronHealth).not.toHaveBeenCalled();
  });

  it("returns 200 and the status when healthy", async () => {
    getCronHealth.mockResolvedValueOnce({ healthy: true, lastHeartbeatAt: "now", ageMinutes: 1, maxAgeMinutes: 15 });
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.healthy).toBe(true);
    expect(sendCronHealthAlert).not.toHaveBeenCalled();
  });

  it("returns 503 when unhealthy, without sending an e-mail when the flag is off", async () => {
    getCronHealth.mockResolvedValueOnce({ healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes: 15 });
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(503);
    expect(sendCronHealthAlert).not.toHaveBeenCalled();
    expect(recordHealthAlertSent).not.toHaveBeenCalled();
  });

  it("sends the alert and records it when unhealthy, the flag is on, and dedupe allows it", async () => {
    isCronHealthAlertEnabled.mockResolvedValueOnce(true);
    const status = { healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes: 15 };
    getCronHealth.mockResolvedValueOnce(status);
    shouldSendHealthAlert.mockResolvedValueOnce(true);

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(503);
    expect(sendCronHealthAlert).toHaveBeenCalledWith(status);
    expect(recordHealthAlertSent).toHaveBeenCalledTimes(1);
  });

  it("does not send the alert when the flag is on but dedupe says it was already sent", async () => {
    isCronHealthAlertEnabled.mockResolvedValueOnce(true);
    getCronHealth.mockResolvedValueOnce({ healthy: false, lastHeartbeatAt: null, ageMinutes: null, maxAgeMinutes: 15 });
    shouldSendHealthAlert.mockResolvedValueOnce(false);

    await GET(makeRequest("Bearer test-secret"));

    expect(sendCronHealthAlert).not.toHaveBeenCalled();
    expect(recordHealthAlertSent).not.toHaveBeenCalled();
  });
});
