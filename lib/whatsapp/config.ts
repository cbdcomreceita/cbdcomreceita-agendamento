/**
 * Static NexTalk IDs for account 5 (CBD Receita), per docs/nextalk-api-lembrete.pdf
 * Apêndice A. These are account-specific, not secrets — safe to hardcode.
 *
 * Target funnel stage is `consulta_agendada`, NOT the PDF's own example
 * (`pagto_consulta`, which is that document's illustrative reminder-before-
 * payment scenario). Our flow fires after payment is already approved, so
 * landing one stage further down the funnel is the correct target — this is
 * the documented "prompt overrides PDF on divergence" case.
 */
export const NEXTALK_BASE_URL = "https://portal.nextalk.ai/api/v1/accounts/5";
export const NEXTALK_INBOX_ID = 13;
export const NEXTALK_FUNNEL_ID = 1;
export const NEXTALK_TARGET_STAGE = "consulta_agendada";
export const NEXTALK_OFFER_ID = 1;
export const NEXTALK_OFFER_DESCRIPTION = "Consulta Padrão";
export const NEXTALK_TEMPLATE_NAME = "confirmacao_consulta";

/** Funnel stage order for account 5's "Funil de Vendas" (funnel_id: 1). */
export const FUNNEL_STAGE_ORDER = [
  "prospeccao",
  "qualificacao",
  "pagto_consulta",
  "consulta_agendada",
  "negocia_o_produtos",
  "pagto_produtos",
  "fechamento",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGE_ORDER)[number];

export function stagePosition(stage: string): number {
  const idx = FUNNEL_STAGE_ORDER.indexOf(stage as FunnelStage);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}

export type WhatsappConfirmationMode = "off" | "team_only" | "all";

export function getConfirmationMode(): WhatsappConfirmationMode {
  const raw = process.env.WHATSAPP_CONFIRMATION_MODE?.trim().toLowerCase();
  if (raw === "team_only" || raw === "all") return raw;
  return "off";
}

export type WhatsappDispatchMode = "qstash" | "inline";

export function getDispatchMode(): WhatsappDispatchMode {
  const raw = process.env.WHATSAPP_DISPATCH_MODE?.trim().toLowerCase();
  return raw === "inline" ? "inline" : "qstash";
}

/**
 * How long confirmBooking waits on the inline WhatsApp send before giving
 * up and moving on. orchestrateConfirmation never throws, so this is only
 * exercised as a last-resort bound (a handful of NexTalk round trips
 * normally finish in low single-digit seconds) — it exists to keep a slow
 * NexTalk from starving the rest of confirmBooking (Meta conversion, the
 * final audit write) well within the payment page's own 45s budget.
 */
export const INLINE_DISPATCH_TIMEOUT_MS = 20000;

/** Parses WHATSAPP_TEAM_NUMBERS ("+5511999999999,+5511888888888") into a Set for O(1) lookup. */
export function getTeamNumbers(): Set<string> {
  const raw = process.env.WHATSAPP_TEAM_NUMBERS ?? "";
  return new Set(
    raw
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
  );
}

export function getNextalkToken(): string {
  return process.env.NEXTALK_API_TOKEN ?? "";
}

export interface WhatsappReadiness {
  ready: boolean;
  /** Names of missing/invalid env vars, for logging + the team alert. */
  missing: string[];
}

/**
 * Full readiness check for everything the WhatsApp confirmation flow needs
 * once the mode is on — not just the NexTalk token. The QStash-specific
 * vars (signing keys, callback base URL) are only required in "qstash"
 * dispatch mode: in "inline" mode confirmBooking calls
 * orchestrateConfirmation directly and never touches QStash at all, so
 * requiring those vars there would block a mode specifically meant to work
 * without them.
 *
 * In "qstash" mode, some of these (signing keys, callback base URL) never
 * cause a throw at publish time — a missing signing key only breaks the
 * QStash → route round trip asynchronously, as a silent 401 nobody would
 * otherwise notice — so this is checked proactively in confirm-booking.ts
 * before attempting to publish, instead of waiting for a real webhook
 * attempt to fail quietly.
 */
export function checkWhatsappReadiness(): WhatsappReadiness {
  if (getConfirmationMode() === "off") return { ready: true, missing: [] };

  const missing: string[] = [];
  if (!getNextalkToken()) missing.push("NEXTALK_API_TOKEN");

  if (getDispatchMode() === "qstash") {
    if (!process.env.QSTASH_TOKEN) missing.push("QSTASH_TOKEN");
    if (!process.env.QSTASH_URL) missing.push("QSTASH_URL");
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY) missing.push("QSTASH_CURRENT_SIGNING_KEY");
    if (!process.env.QSTASH_NEXT_SIGNING_KEY) missing.push("QSTASH_NEXT_SIGNING_KEY");

    const callbackBaseUrl = process.env.WHATSAPP_CALLBACK_BASE_URL;
    if (!callbackBaseUrl || !callbackBaseUrl.startsWith("https://")) {
      missing.push("WHATSAPP_CALLBACK_BASE_URL");
    }
  }

  return { ready: missing.length === 0, missing };
}
