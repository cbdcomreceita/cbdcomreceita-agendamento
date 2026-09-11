import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyQstashSignature = vi.fn();
const orchestrateConfirmation = vi.fn();

vi.mock("@/lib/whatsapp/qstash", () => ({
  verifyQstashSignature: (...a: unknown[]) => verifyQstashSignature(...a),
  SEND_CONFIRMATION_PATH: "/api/whatsapp/send-confirmation",
}));
vi.mock("@/lib/whatsapp/orchestrate-confirmation", () => ({
  orchestrateConfirmation: (...a: unknown[]) => orchestrateConfirmation(...a),
}));
vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const { POST } = await import("./route");

function makeRequest(body: string, signature: string | null) {
  const headers: Record<string, string> = {};
  if (signature !== null) headers["Upstash-Signature"] = signature;
  return new NextRequest("http://localhost/api/whatsapp/send-confirmation", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  verifyQstashSignature.mockReset();
  orchestrateConfirmation.mockReset();
});

describe("POST /api/whatsapp/send-confirmation", () => {
  it("rejects a request with no Upstash-Signature header at all", async () => {
    verifyQstashSignature.mockResolvedValueOnce(false);
    const req = makeRequest(JSON.stringify({ bookingId: "abc" }), null);

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(verifyQstashSignature).toHaveBeenCalledWith(null, expect.any(String), "/api/whatsapp/send-confirmation");
    expect(orchestrateConfirmation).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid signature", async () => {
    verifyQstashSignature.mockResolvedValueOnce(false);
    const req = makeRequest(JSON.stringify({ bookingId: "abc" }), "bad-signature");

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(orchestrateConfirmation).not.toHaveBeenCalled();
  });

  it("runs the orchestration and returns 200 once the signature is valid", async () => {
    verifyQstashSignature.mockResolvedValueOnce(true);
    orchestrateConfirmation.mockResolvedValueOnce(undefined);
    const req = makeRequest(JSON.stringify({ bookingId: "abc" }), "good-signature");

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(orchestrateConfirmation).toHaveBeenCalledWith("abc");
  });

  it("still returns 200 (not a retry-triggering status) when orchestration finds no bookingId", async () => {
    verifyQstashSignature.mockResolvedValueOnce(true);
    const req = makeRequest(JSON.stringify({}), "good-signature");

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(orchestrateConfirmation).not.toHaveBeenCalled();
  });
});
