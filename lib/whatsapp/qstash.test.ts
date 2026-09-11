import { afterEach, describe, expect, it, vi } from "vitest";
import { getCallbackBaseUrl, SEND_CONFIRMATION_PATH, verifyQstashSignature } from "./qstash";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getCallbackBaseUrl", () => {
  it("throws when WHATSAPP_CALLBACK_BASE_URL is unset", () => {
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "");
    expect(() => getCallbackBaseUrl()).toThrow("WHATSAPP_CALLBACK_BASE_URL not configured");
  });

  it("throws when the value doesn't start with https://", () => {
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "http://www.cbdcomreceita.com.br");
    expect(() => getCallbackBaseUrl()).toThrow("must start with https://");
  });

  it("strips a trailing slash", () => {
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "https://www.cbdcomreceita.com.br/");
    expect(getCallbackBaseUrl()).toBe("https://www.cbdcomreceita.com.br");
  });

  it("passes through a value with no trailing slash unchanged", () => {
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "https://www.cbdcomreceita.com.br");
    expect(getCallbackBaseUrl()).toBe("https://www.cbdcomreceita.com.br");
  });
});

describe("verifyQstashSignature", () => {
  it("returns false (fail-closed) when there is no signature header, without ever calling the Receiver", async () => {
    const result = await verifyQstashSignature(null, "{}", SEND_CONFIRMATION_PATH);
    expect(result).toBe(false);
  });

  it("returns false (fail-closed) for an invalid/garbage signature", async () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_test_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_test_next");
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "https://www.cbdcomreceita.com.br");
    const result = await verifyQstashSignature("not-a-real-signature", "{}", SEND_CONFIRMATION_PATH);
    expect(result).toBe(false);
  });

  it("returns false (never throws) when the signing keys aren't configured at all", async () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "https://www.cbdcomreceita.com.br");
    await expect(verifyQstashSignature("anything", "{}", SEND_CONFIRMATION_PATH)).resolves.toBe(false);
  });

  it("returns false (never throws) when WHATSAPP_CALLBACK_BASE_URL itself is missing, even with valid-looking keys", async () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_test_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_test_next");
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "");
    await expect(verifyQstashSignature("anything", "{}", SEND_CONFIRMATION_PATH)).resolves.toBe(false);
  });
});
