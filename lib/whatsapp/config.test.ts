import { afterEach, describe, expect, it, vi } from "vitest";
import { checkWhatsappReadiness, getConfirmationMode } from "./config";

const ALL_REQUIRED_ENVS = {
  NEXTALK_API_TOKEN: "some-real-token",
  QSTASH_TOKEN: "qstash-token",
  QSTASH_URL: "https://qstash-us-east-1.upstash.io",
  QSTASH_CURRENT_SIGNING_KEY: "sig_current",
  QSTASH_NEXT_SIGNING_KEY: "sig_next",
  WHATSAPP_CALLBACK_BASE_URL: "https://www.cbdcomreceita.com.br",
};

function stubAllRequiredEnvs() {
  for (const [key, value] of Object.entries(ALL_REQUIRED_ENVS)) {
    vi.stubEnv(key, value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getConfirmationMode", () => {
  it("defaults to 'off' when WHATSAPP_CONFIRMATION_MODE is unset", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "");
    expect(getConfirmationMode()).toBe("off");
  });

  it("defaults to 'off' for any unrecognized value (fail closed, never silently send)", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "on"); // not a valid mode
    expect(getConfirmationMode()).toBe("off");
  });

  it("accepts 'team_only' and 'all'", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "team_only");
    expect(getConfirmationMode()).toBe("team_only");
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "all");
    expect(getConfirmationMode()).toBe("all");
  });
});

describe("checkWhatsappReadiness", () => {
  it("is ready with nothing required when mode is 'off', regardless of what else is missing", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "off");
    expect(checkWhatsappReadiness()).toEqual({ ready: true, missing: [] });
  });

  it("is ready when mode is active and every required var is present", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "team_only");
    stubAllRequiredEnvs();
    expect(checkWhatsappReadiness()).toEqual({ ready: true, missing: [] });
  });

  it("reports NEXTALK_API_TOKEN as missing when mode is active but the token is absent — this used to be a silent skip", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "all");
    stubAllRequiredEnvs();
    vi.stubEnv("NEXTALK_API_TOKEN", "");
    const result = checkWhatsappReadiness();
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("NEXTALK_API_TOKEN");
  });

  it.each([
    "QSTASH_TOKEN",
    "QSTASH_URL",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
    "WHATSAPP_CALLBACK_BASE_URL",
  ])("reports %s as missing when mode is active but it's absent", (missingVar) => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "all");
    stubAllRequiredEnvs();
    vi.stubEnv(missingVar, "");
    const result = checkWhatsappReadiness();
    expect(result.ready).toBe(false);
    expect(result.missing).toContain(missingVar);
  });

  it("rejects a WHATSAPP_CALLBACK_BASE_URL that doesn't start with https://", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "all");
    stubAllRequiredEnvs();
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "http://www.cbdcomreceita.com.br");
    const result = checkWhatsappReadiness();
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("WHATSAPP_CALLBACK_BASE_URL");
  });

  it("lists every missing var at once, not just the first", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_MODE", "team_only");
    vi.stubEnv("NEXTALK_API_TOKEN", "");
    vi.stubEnv("QSTASH_TOKEN", "");
    vi.stubEnv("QSTASH_URL", "");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
    vi.stubEnv("WHATSAPP_CALLBACK_BASE_URL", "");
    const result = checkWhatsappReadiness();
    expect(result.ready).toBe(false);
    expect(result.missing).toHaveLength(6);
  });
});
