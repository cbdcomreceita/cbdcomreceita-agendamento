"use server";

import { addDays } from "date-fns";

export interface TimeSlot {
  time: string; // ISO string
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

/**
 * Fetch available slots from Cal.com API v2.
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

  const startTime = new Date().toISOString();
  const endTime = addDays(new Date(), 30).toISOString();

  const url = new URL("https://api.cal.com/v2/slots/available");
  url.searchParams.set("eventTypeId", String(eventTypeId));
  url.searchParams.set("startTime", startTime);
  url.searchParams.set("endTime", endTime);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Cal.com] API error:", res.status, body);
      return [];
    }

    const json = await res.json();
    const slotsMap = json?.data?.slots as Record<string, TimeSlot[]> | undefined;
    if (!slotsMap) return [];

    const result: DaySlots[] = [];
    for (const [date, slots] of Object.entries(slotsMap)) {
      if (slots.length > 0) {
        result.push({ date, slots });
      }
    }

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result.slice(0, 3);
  } catch (err) {
    console.error("[Cal.com] Failed to fetch slots:", err);
    return [];
  }
}
