"use server";

import { logError } from "@/lib/audit/log-error";

const API_KEY = process.env.CALCOM_API_KEY || "";

export interface CalcomBookingResult {
  success: boolean;
  bookingId?: number;
  bookingUid?: string;
  meetLink?: string;
  error?: string;
  /** True when Cal.com rejected the booking because the slot is no longer
   * available — a 409 ConflictException ("User either already has booking
   * at this time or is not available"). Confirmed live against the real
   * API on 2026-11-06. Entrega 3, item 2h: the reservation taken at PIX
   * generation normally prevents this, but a payment approved for a
   * booking whose reservation already expired (or wasn't taken at all,
   * e.g. AGENDA_3_NEXT_ENABLED was off when the PIX was generated) can
   * still race here. */
  conflict?: boolean;
}

interface BookingInput {
  eventTypeId: number;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
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
  // Doctor is intentionally NOT added as guest here — they're notified via
  // sendDoctorIntake (Resend), Cal.com workflows, and the shared Google
  // Calendar. Adding them as a guest would also surface their email in the
  // patient's invite, which we don't want.
  const requestBody = {
    eventTypeId: input.eventTypeId,
    start: input.scheduledAt,
    attendee: {
      name: input.patientName,
      email: input.patientEmail,
      timeZone: "America/Sao_Paulo",
      language: "pt-BR",
    },
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
      let conflict = false;
      try {
        const parsed = JSON.parse(responseText) as { error?: { code?: string } };
        conflict = res.status === 409 && parsed.error?.code === "ConflictException";
      } catch {
        // Non-JSON body — leave conflict false, treated as a generic failure.
      }
      await logError({
        scope: "calcom",
        message: `Booking creation failed (${res.status})`,
        metadata: {
          status: res.status,
          responseBody: responseText.slice(0, 1500),
          requestBody,
          conflict,
        },
        entityId: input.metadata?.bookingId,
      });
      return { success: false, error: `Cal.com error ${res.status}: ${responseText}`, conflict };
    }

    const data = JSON.parse(responseText);
    const booking = data.data;

    // Cal.com v2 returns the Meet URL in different fields depending on
    // how the event type's location is configured. Try all known shapes.
    const references: { meetingUrl?: string; meetingPassword?: string }[] =
      Array.isArray(booking?.references) ? booking.references : [];
    const refMeetLink = references.find((r) => r.meetingUrl)?.meetingUrl;

    const rawLocation: unknown = booking?.location;
    const locationUrl =
      typeof rawLocation === "string" && rawLocation.startsWith("http")
        ? rawLocation
        : undefined;

    const result: CalcomBookingResult = {
      success: true,
      bookingId: booking?.id,
      bookingUid: booking?.uid,
      meetLink:
        booking?.meetingUrl ||
        refMeetLink ||
        locationUrl ||
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
    await logError({
      scope: "calcom",
      message: "Booking creation threw",
      metadata: { error: String(err), requestBody },
      entityId: input.metadata?.bookingId,
    });
    return { success: false, error: String(err) };
  }
}
