"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import { stripPaymentTokenPrefix } from "@/lib/utils/payment-token";
import { rateLimiters, tryCheckRateLimit, getClientIp, maskIp } from "@/lib/rate-limit";
import { formatDateLong } from "@/lib/utils/datetime";

export interface IntakeByTokenResult {
  found: boolean;
  /** True when intake_completed_at is already set — the page shows a
   * "dados recebidos" state without exposing any previously-submitted data. */
  alreadyCompleted?: boolean;
  /** True when the consultation's end time has already passed — the token
   * stops being usable at that point ("válido até o fim da consulta"). */
  expired?: boolean;
  bookingId?: string;
  patientName?: string;
  doctorName?: string;
  scheduledAt?: string;
  scheduledAtFormatted?: string;
}

/**
 * Looks up a booking by its intake_token for /prontuario/[token] — same
 * {{1}}/%7B%7B1%7D%7D prefix defect as /pagamento/[token] (see
 * lib/utils/payment-token.ts), since both links are delivered the same way
 * (a WhatsApp template URL button). Read-only.
 */
export async function getIntakeByToken(rawToken: string): Promise<IntakeByTokenResult> {
  const token = stripPaymentTokenPrefix(rawToken.trim());
  if (!token) return { found: false };

  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);
  const rl = await tryCheckRateLimit(rateLimiters.intake, ip);
  if (!rl.ok) {
    const supabase = createServiceClient();
    await supabase.from("audit_events").insert({
      event_type: "rate_limit_exceeded",
      entity_type: "rate_limit",
      metadata: { endpoint: "get-intake-by-token", ip: maskIp(ip) },
    });
    return { found: false };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, scheduled_at, scheduled_end_at, intake_required, intake_completed_at, patients(full_name), doctors(name)"
    )
    .eq("intake_token", token)
    .eq("intake_required", true)
    .maybeSingle();

  if (error) {
    await logError({
      scope: "create",
      message: "getIntakeByToken: query failed",
      metadata: { error },
    });
    return { found: false };
  }

  if (!data) return { found: false };

  type PatientRow = { full_name: string } | null;
  type DoctorRow = { name: string } | null;
  const patient = data.patients as unknown as PatientRow;
  const doctor = data.doctors as unknown as DoctorRow;
  if (!patient || !doctor) return { found: false };

  if (data.intake_completed_at) {
    return { found: true, alreadyCompleted: true, bookingId: data.id };
  }

  // Válido até o fim da consulta — scheduled_end_at when present, else
  // scheduled_at + 25min (the standard consultation length).
  const endIso = data.scheduled_end_at ?? new Date(new Date(data.scheduled_at).getTime() + 25 * 60 * 1000).toISOString();
  if (new Date(endIso).getTime() < Date.now()) {
    return { found: true, expired: true, bookingId: data.id };
  }

  return {
    found: true,
    alreadyCompleted: false,
    bookingId: data.id,
    patientName: patient.full_name,
    doctorName: doctor.name,
    scheduledAt: data.scheduled_at,
    scheduledAtFormatted: formatDateLong(data.scheduled_at),
  };
}
