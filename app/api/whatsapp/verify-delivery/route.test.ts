import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyQstashSignature = vi.fn();
const verifyDelivery = vi.fn();

vi.mock("@/lib/whatsapp/qstash", () => ({
  verifyQstashSignature: (...a: unknown[]) => verifyQstashSignature(...a),
  VERIFY_DELIVERY_PATH: "/api/whatsapp/verify-delivery",
}));
vi.mock("@/lib/whatsapp/verify-delivery", () => ({ verifyDelivery: (...a: unknown[]) => verifyDelivery(...a) }));
vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const { POST } = await import("./route");

function makeRequest(body: string, signature: string | null) {
  const headers: Record<string, string> = {};
  if (signature !== null) headers["Upstash-Signature"] = signature;
  return new NextRequest("http://localhost/api/whatsapp/verify-delivery", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  verifyQstashSignature.mockReset();
  verifyDelivery.mockReset();
});

describe("POST /api/whatsapp/verify-delivery", () => {
  it("rejects a request with no Upstash-Signature header at all", async () => {
    verifyQstashSignature.mockResolvedValueOnce(false);
    const req = makeRequest(JSON.stringify({ notificationLogId: "abc" }), null);

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(verifyQstashSignature).toHaveBeenCalledWith(null, expect.any(String), "/api/whatsapp/verify-delivery");
    expect(verifyDelivery).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid signature", async () => {
    verifyQstashSignature.mockResolvedValueOnce(false);
    const req = makeRequest(JSON.stringify({ notificationLogId: "abc" }), "bad-signature");

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(verifyDelivery).not.toHaveBeenCalled();
  });

  it("runs the delivery check and returns 200 once the signature is valid", async () => {
    verifyQstashSignature.mockResolvedValueOnce(true);
    verifyDelivery.mockResolvedValueOnce(undefined);
    const req = makeRequest(JSON.stringify({ notificationLogId: "abc" }), "good-signature");

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(verifyDelivery).toHaveBeenCalledWith("abc");
  });
});
