"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { Doctor } from "@/lib/types/doctor";
import type { Weekday, Period, ScheduleSlot } from "@/lib/types/availability";
import { PERIOD_ORDER } from "@/lib/triagem/schedule";

const DOCTOR_COLUMNS =
  "id, name, crm, crm_uf, specialties, bio_short, photo_url, email, calcom_event_type_slug, calcom_event_type_id, global_priority, handles_minors, handles_elderly, is_active, medical_specialty";

/** All active doctors, ordered by global_priority ASC. Single source of truth for doctor reads. */
export async function getActiveDoctors(): Promise<Doctor[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("doctors")
    .select(DOCTOR_COLUMNS)
    .eq("is_active", true)
    .order("global_priority", { ascending: true });

  if (error) throw new Error(`Erro ao buscar médicos: ${error.message}`);
  return (data ?? []) as Doctor[];
}

export async function getDoctorById(id: string): Promise<Doctor | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("doctors")
    .select(DOCTOR_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar médico: ${error.message}`);
  return data as Doctor | null;
}

/**
 * Every (weekday, period) combination that currently has at least one
 * active doctor available. Drives the schedule selector — the selector
 * shows nothing that isn't in this list, so an impossible combination can
 * never be picked. Purely derived from doctor_availability at query time;
 * adding/removing a row updates the selector with no deploy.
 */
export async function getScheduleOptions(): Promise<ScheduleSlot[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("doctor_availability")
    .select("weekday, period, doctors!inner(is_active)")
    .eq("doctors.is_active", true);

  if (error) throw new Error(`Erro ao buscar disponibilidade: ${error.message}`);

  const seen = new Set<string>();
  const options: ScheduleSlot[] = [];
  for (const row of data ?? []) {
    const weekday = row.weekday as Weekday;
    const period = row.period as Period;
    const key = `${weekday}-${period}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ weekday, period });
  }

  options.sort(
    (a, b) => a.weekday - b.weekday || PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]
  );
  return options;
}

/**
 * Active doctors available in at least one of the given (weekday, period)
 * slots, sorted by global_priority ASC (tie-break: id) — global_priority
 * is the operator's live load-balancing lever, read fresh every call, never
 * hardcoded. Matches slots exactly (not an axis cross-product): a doctor
 * only qualifies for a pair the patient actually selected.
 */
export async function getDoctorCandidatesForSchedule(
  slots: ScheduleSlot[]
): Promise<Doctor[]> {
  if (slots.length === 0) return [];

  const weekdays = [...new Set(slots.map((s) => s.weekday))];
  const periods = [...new Set(slots.map((s) => s.period))];
  const slotKeys = new Set(slots.map((s) => `${s.weekday}-${s.period}`));

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("doctor_availability")
    .select(`weekday, period, doctors!inner(${DOCTOR_COLUMNS})`)
    .in("weekday", weekdays)
    .in("period", periods)
    .eq("doctors.is_active", true);

  if (error) throw new Error(`Erro ao buscar disponibilidade: ${error.message}`);

  const seen = new Set<string>();
  const candidates: Doctor[] = [];
  for (const row of data ?? []) {
    if (!slotKeys.has(`${row.weekday}-${row.period}`)) continue;
    const doctor = row.doctors as unknown as Doctor;
    if (seen.has(doctor.id)) continue;
    seen.add(doctor.id);
    candidates.push(doctor);
  }

  candidates.sort(
    (a, b) => a.global_priority - b.global_priority || a.id.localeCompare(b.id)
  );
  return candidates;
}
