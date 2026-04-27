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

  try {
    const res = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify({
        eventTypeId: input.eventTypeId,
        start: input.scheduledAt,
        title: `Consulta ${input.patientName} : ${input.doctorName}`,
        lengthInMinutes: 25,
        attendee: {
          name: input.patientName,
          email: input.patientEmail,
          timeZone: "America/Sao_Paulo",
          language: "pt-BR",
        },
        guests: [input.doctorEmail],
        metadata: input.metadata ?? {},
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Cal.com] Booking creation failed:", res.status, body);
      return { success: false, error: `Cal.com error ${res.status}: ${body}` };
    }

    const data = await res.json();
    const booking = data.data;

    return {
      success: true,
      bookingId: booking?.id,
      bookingUid: booking?.uid,
      meetLink: booking?.meetingUrl || booking?.metadata?.videoCallUrl,
    };
  } catch (err) {
    console.error("[Cal.com] Booking creation error:", err);
    return { success: false, error: String(err) };
  }
}
