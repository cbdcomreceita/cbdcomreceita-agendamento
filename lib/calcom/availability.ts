"use server";

import { addDays } from "date-fns";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import {
  rateLimiters,
  tryCheckRateLimit,
  getClientIp,
  maskIp,
} from "@/lib/rate-limit";

export interface TimeSlot {
  time: string; // ISO string
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

/**
 * Fetch available slots from Cal.com API v2.
 *
 * Endpoint: GET /v2/slots
 * Version:  2024-09-04 (older /v2/slots/available endpoint was deprecated/removed)
 * Response shape:
 *   { status: "success", data: { "YYYY-MM-DD": [{ start: ISO }, ...], ... } }
 *
 * Searches next 30 days, returns only days with slots, max 3 days.
 */
export async function getAvailableSlots(
  eventTypeId: number
): Promise<DaySlots[]> {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) {
    console.error("[Cal.com] CALCOM_API_KEY not set");
    return [];
  }

  // Rate limit per IP (15/min) — protects Cal.com quota and blocks
  // scrapers. On rate-limited requests we audit and return [] so the
  // slot-picker shows the empty state. The 1-min window is short
  // enough that legit users rarely notice.
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

  const start = new Date().toISOString();
  const end = addDays(new Date(), 30).toISOString();

  const url = new URL("https://api.cal.com/v2/slots");
  url.searchParams.set("eventTypeId", String(eventTypeId));
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);

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

    const result: DaySlots[] = [];
    for (const [date, slots] of Object.entries(slotsMap)) {
      if (slots.length > 0) {
        result.push({
          date,
          slots: slots.map((s) => ({ time: s.start })),
        });
      }
    }

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result.slice(0, 3);
  } catch (err) {
    console.error("[Cal.com] Failed to fetch slots:", err);
    return [];
  }
}
