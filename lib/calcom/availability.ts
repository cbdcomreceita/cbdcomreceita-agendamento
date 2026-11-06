"use server";

import { addDays } from "date-fns";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import {
  rateLimiters,
  tryCheckRateLimit,
  getClientIp,
  maskIp,
  redis,
} from "@/lib/rate-limit";
import { MIN_LEAD_HOURS } from "./config";
import { TIMEZONE } from "@/lib/utils/datetime";

export interface TimeSlot {
  time: string; // ISO string
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

const CACHE_TTL_SECONDS = 90;

function slotsCacheKey(eventTypeId: number, daysAhead: number): string {
  return `slots:${eventTypeId}:${daysAhead}`;
}

/** Fail-open on any Upstash error, same pattern as rate limiting: treat as a cache miss. */
async function getCachedSlots(eventTypeId: number, daysAhead: number): Promise<DaySlots[] | null> {
  try {
    return await redis.get<DaySlots[]>(slotsCacheKey(eventTypeId, daysAhead));
  } catch (err) {
    console.error("[Cal.com] cache read failed, falling through:", err);
    return null;
  }
}

async function setCachedSlots(eventTypeId: number, daysAhead: number, data: DaySlots[]): Promise<void> {
  try {
    await redis.set(slotsCacheKey(eventTypeId, daysAhead), data, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.error("[Cal.com] cache write failed:", err);
  }
}

/**
 * Fetch available slots from Cal.com API v2.
 *
 * Endpoint: GET /v2/slots
 * Version:  2024-09-04 (older /v2/slots/available endpoint was deprecated/removed)
 * Response shape:
 *   { status: "success", data: { "YYYY-MM-DD": [{ start: ISO }, ...], ... } }
 *
 * Searches the next `daysAhead` days, returns only days with slots, capped
 * to the nearest `maxDays` of them (default 3, matching the single-doctor
 * picker this was originally built for — Entrega 3's multi-doctor "3 next
 * agendas" engine needs to scan much further, so it passes a larger value).
 *
 * Cached in Upstash for 90s per (eventTypeId, daysAhead) — checked before
 * the rate limiter, so cache hits don't burn a visitor's request budget
 * and don't touch Cal.com at all. Fail-open on any Upstash error (same
 * pattern as rate limiting): treated as a miss, falls through to the API.
 * The cache stores the FULL (untrimmed) result — maxDays is applied on
 * every read, cache hit or miss, so two callers sharing (eventTypeId,
 * daysAhead) with different maxDays never see each other's trimmed cache.
 */
export async function getAvailableSlots(
  eventTypeId: number,
  daysAhead = 30,
  maxDays = 3
): Promise<DaySlots[]> {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) {
    console.error("[Cal.com] CALCOM_API_KEY not set");
    return [];
  }

  const cached = await getCachedSlots(eventTypeId, daysAhead);
  if (cached) return cached.slice(0, maxDays);

  // Rate limit per IP — protects Cal.com quota and blocks scrapers. Only
  // reached on a cache miss. On rate-limited requests we audit and
  // return [] so the slot-picker shows the empty state.
  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);
  const rl = await tryCheckRateLimit(rateLimiters.slots, ip);
  if (!rl.ok) {
    const supabase = createServiceClient();
    await supabase
      .from("audit_events")
      .insert({
        event_type: "rate_limit_exceeded",
        entity_type: "rate_limit",
        metadata: {
          endpoint: "slots",
          ip: maskIp(ip),
          eventTypeId,
          limit: rl.limit,
        },
      });
    return [];
  }

  const minLeadMs = MIN_LEAD_HOURS * 60 * 60 * 1000;
  const earliestBookable = new Date(Date.now() + minLeadMs);
  const start = earliestBookable.toISOString();
  const end = addDays(new Date(), daysAhead).toISOString();

  const url = new URL("https://api.cal.com/v2/slots");
  url.searchParams.set("eventTypeId", String(eventTypeId));
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);
  // Without this, Cal.com buckets the response's date keys by UTC calendar
  // day instead of the doctor's actual day — a Friday-night BRT slot
  // (21h BRT = 00h UTC Saturday) was coming back keyed under "Saturday",
  // so getNextAgendaBlocks' weekday-from-date-key filter silently dropped
  // every evening slot that crosses midnight UTC. Confirmed live against
  // the real Cal.com API (event 6217774) on 2026-11-06.
  url.searchParams.set("timeZone", TIMEZONE);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "cal-api-version": "2024-09-04",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Cal.com] Slots API error:", res.status, body);
      return [];
    }

    const json = (await res.json()) as {
      status?: string;
      data?: Record<string, Array<{ start: string }>>;
    };
    const slotsMap = json.data;
    if (!slotsMap) return [];

    const earliestBookableIso = earliestBookable.toISOString();
    const result: DaySlots[] = [];
    for (const [date, slots] of Object.entries(slotsMap)) {
      // Defensive — Cal.com buckets by calendar day, so the day containing
      // `start` can still include slots just before the exact instant.
      const futureEnough = slots.filter((s) => s.start >= earliestBookableIso);
      if (futureEnough.length > 0) {
        result.push({
          date,
          slots: futureEnough.map((s) => ({ time: s.start })),
        });
      }
    }

    result.sort((a, b) => a.date.localeCompare(b.date));
    await setCachedSlots(eventTypeId, daysAhead, result);
    return result.slice(0, maxDays);
  } catch (err) {
    console.error("[Cal.com] Failed to fetch slots:", err);
    return [];
  }
}
