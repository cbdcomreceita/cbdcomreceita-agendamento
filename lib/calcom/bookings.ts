"use server";

const API_KEY = process.env.CALCOM_API_KEY || "";

export interface CalcomBookingResult {
  success: boolean;
  bookingId?: number;
  bookingUid?: string;
  meetLink?: string;
  error?: string;
}

interface BookingInput {
  eventTypeId: number;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  notes: string;
  metadata?: Record<string, string>;
}

/**
 * Create a real booking in Cal.com via API v2.
 * Called AFTER payment is confirmed.
 */
export async function createCalcomBooking(
  input: BookingInput
): Promise<CalcomBookingResult> {
  if (!API_KEY) {
    console.warn("[Cal.com] API key not set — skipping booking creation (mock mode)");
    return {
      success: true,
      bookingId: Math.floor(Math.random() * 100000),
      bookingUid: `mock-${crypto.randomUUID().slice(0, 8)}`,
      meetLink: "https://meet.google.com/mock-link",
    };
  }

  // Note: do NOT send `title` or `lengthInMinutes` here — API v2
  // (cal-api-version 2024-08-13) rejects unknown top-level fields with 400.
  // The event title comes from the event type's `customName` template
  // configured in Cal.com (e.g. "Consulta {Scheduler} : Dra. Carolina Lopes").
  const requestBody = {
    eventTypeId: input.eventTypeId,
    start: input.scheduledAt,
    attendee: {
      name: input.patientName,
      email: input.patientEmail,
      timeZone: "America/Sao_Paulo",
      language: "pt-BR",
    },
    guests: [input.doctorEmail],
    metadata: input.metadata ?? {},
  };

  console.log("[Cal.com] Booking POST body:", JSON.stringify(requestBody));

  try {
    const res = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await res.text();
    console.log("[Cal.com] Booking response status:", res.status);
    console.log("[Cal.com] Booking response body:", responseText.slice(0, 1500));

    if (!res.ok) {
      return { success: false, error: `Cal.com error ${res.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    const booking = data.data;

    const result: CalcomBookingResult = {
      success: true,
      bookingId: booking?.id,
      bookingUid: booking?.uid,
      meetLink:
        booking?.meetingUrl ||
        booking?.location ||
        booking?.metadata?.videoCallUrl,
    };
    console.log(
      "[Cal.com] Booking parsed:",
      JSON.stringify({
        bookingId: result.bookingId,
        bookingUid: result.bookingUid,
        meetLink: result.meetLink,
      })
    );
    return result;
  } catch (err) {
    console.error("[Cal.com] Booking creation error:", err);
    return { success: false, error: String(err) };
  }
}
