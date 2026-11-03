"use server";

import { logError } from "@/lib/audit/log-error";

const API_KEY = process.env.CALCOM_API_KEY || "";
const CAL_API_VERSION = "2024-09-04";

export interface ReserveSlotInput {
  eventTypeId: number;
  /** ISO 8601 UTC. */
  slotStart: string;
  /** Minutes — PIX_EXPIRATION_MINUTES in practice. Confirmed working with
   * 120 against the real Cal.com API/key on 2026-11-03 (no documented
   * upper bound hit); if a future API key/plan rejects it, this function
   * surfaces the error untouched rather than silently retrying smaller. */
  reservationDurationMinutes: number;
}

export interface ReserveSlotResult {
  success: boolean;
  reservationUid?: string;
  /** ISO 8601 — when the hold releases itself if never explicitly deleted. */
  reservationUntil?: string;
  error?: string;
}

/**
 * POST /v2/slots/reservations — holds a slot so other visitors don't see it
 * in GET /v2/slots while this patient has a PIX open (Entrega 3, item 4).
 * Does NOT create a real booking — createCalcomBooking (bookings.ts) still
 * does that unchanged at payment confirmation; the hold just protects the
 * slot in the meantime. Never throws — mock mode (no API key) and any
 * Cal.com error both resolve to { success: false }.
 */
export async function reserveCalcomSlot(input: ReserveSlotInput): Promise<ReserveSlotResult> {
  if (!API_KEY) {
    console.warn("[Cal.com] API key not set — skipping slot reservation (mock mode)");
    return { success: false, error: "mock_mode" };
  }

  try {
    const res = await fetch("https://api.cal.com/v2/slots/reservations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION,
      },
      body: JSON.stringify({
        eventTypeId: input.eventTypeId,
        slotStart: input.slotStart,
        reservationDuration: input.reservationDurationMinutes,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      await logError({
        scope: "calcom",
        message: `Slot reservation failed (${res.status})`,
        metadata: { status: res.status, body: text.slice(0, 1000), input },
      });
      return { success: false, error: `Cal.com error ${res.status}: ${text}` };
    }

    const json = JSON.parse(text) as { data?: { reservationUid?: string; reservationUntil?: string } };
    const reservationUid = json.data?.reservationUid;
    if (!reservationUid) {
      await logError({
        scope: "calcom",
        message: "Slot reservation response missing reservationUid",
        metadata: { body: text.slice(0, 1000), input },
      });
      return { success: false, error: "missing_reservation_uid" };
    }

    return { success: true, reservationUid, reservationUntil: json.data?.reservationUntil };
  } catch (err) {
    await logError({
      scope: "calcom",
      message: "Slot reservation threw",
      metadata: { error: String(err), input },
    });
    return { success: false, error: String(err) };
  }
}

/**
 * DELETE /v2/slots/reservations/{uid} — releases a hold early (Entrega 3,
 * item 4: "PIX expirado: apague a reserva"). Best-effort: the hold expires
 * on its own at reservationUntil regardless, so a failure here just means
 * the slot stays blocked a little longer, never a data-integrity problem.
 * Never throws.
 */
export async function releaseCalcomSlot(reservationUid: string): Promise<{ success: boolean }> {
  if (!API_KEY) return { success: false };

  try {
    const res = await fetch(`https://api.cal.com/v2/slots/reservations/${reservationUid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "cal-api-version": CAL_API_VERSION,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      await logError({
        scope: "calcom",
        message: `Slot release failed (${res.status})`,
        metadata: { status: res.status, body: body.slice(0, 500), reservationUid },
      });
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    await logError({
      scope: "calcom",
      message: "Slot release threw",
      metadata: { error: String(err), reservationUid },
    });
    return { success: false };
  }
}
