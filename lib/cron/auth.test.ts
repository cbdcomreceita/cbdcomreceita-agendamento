import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isCronAuthorized } from "./auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(authHeader: string | null) {
  const headers: Record<string, string> = {};
  if (authHeader !== null) headers["authorization"] = authHeader;
  return new NextRequest("http://localhost/api/cron/funnel", { headers });
}

describe("isCronAuthorized", () => {
  it("rejects when CRON_SECRET is unset, regardless of the header", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronAuthorized(makeRequest("Bearer anything"))).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t");
    expect(isCronAuthorized(makeRequest(null))).toBe(false);
  });

  it("rejects the wrong bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t");
    expect(isCronAuthorized(makeRequest("Bearer wrong"))).toBe(false);
  });

  it("accepts the exact right bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t");
    expect(isCronAuthorized(makeRequest("Bearer s3cr3t"))).toBe(true);
  });
});
