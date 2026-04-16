"use server";

export interface TimeSlot {
  time: string; // ISO string
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

/**
 * Fetch available slots from Cal.com API.
 * Returns slots for the given date range.
 */
export async function getAvailableSlots(
  eventTypeSlug: string,
  startDate: string,
  endDate: string
): Promise<DaySlots[]> {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) {
    console.error("CALCOM_API_KEY not set");
    return [];
  }

  const username = "cbdcomreceita";
  const url = new URL("https://api.cal.com/v1/slots/available");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("eventTypeSlug", eventTypeSlug);
  url.searchParams.set("username", username);
  url.searchParams.set("startTime", startDate);
  url.searchParams.set("endTime", endDate);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 }, // cache for 1 min
    });

    if (!res.ok) {
      console.error("Cal.com API error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();

    // Cal.com returns { slots: { "YYYY-MM-DD": [{ time: "..." }] } }
    const slotsMap = data.slots as Record<string, TimeSlot[]> | undefined;
    if (!slotsMap) return [];

    const result: DaySlots[] = [];
    for (const [date, slots] of Object.entries(slotsMap)) {
      if (slots.length > 0) {
        result.push({ date, slots });
      }
    }

    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
  } catch (err) {
    console.error("Failed to fetch Cal.com slots:", err);
    return [];
  }
}
