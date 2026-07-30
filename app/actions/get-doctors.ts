"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { Doctor } from "@/lib/types/doctor";
import type { Weekday, Period } from "@/lib/types/availability";

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
 * Doctor to route a patient to given selected weekdays/periods, picking the
 * lowest global_priority among active doctors available in any of the
 * given slots. Returns null if nothing matches (caller decides fallback).
 */
export async function getDoctorForSchedule(
  weekdays: Weekday[],
  periods: Period[]
): Promise<Doctor | null> {
  if (weekdays.length === 0 || periods.length === 0) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("doctor_availability")
    .select(`doctor_id, doctors!inner(${DOCTOR_COLUMNS})`)
    .in("weekday", weekdays)
    .in("period", periods)
    .eq("doctors.is_active", true);

  if (error) throw new Error(`Erro ao buscar disponibilidade: ${error.message}`);

  const candidates = (data ?? [])
    .map((row) => row.doctors as unknown as Doctor)
    .filter(Boolean);
  if (candidates.length === 0) return null;

  return candidates.reduce((best, d) =>
    d.global_priority < best.global_priority ? d : best
  );
}
