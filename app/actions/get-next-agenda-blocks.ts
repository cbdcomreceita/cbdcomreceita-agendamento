"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getActiveDoctors } from "@/app/actions/get-doctors";
import { getAvailableSlots } from "@/lib/calcom/availability";
import { classifyPeriod } from "@/lib/calcom/config";
import { AUTISM_EXCLUDED_DOCTOR_IDS } from "@/lib/doctors/special-rules";
import type { Doctor } from "@/lib/types/doctor";
import type { Period, ScheduleSlot } from "@/lib/types/availability";

/** How many calendar days ahead each candidate's Cal.com slots are scanned. */
const BLOCKS_SCAN_DAYS = 14;
/** Cap per doctor on how many of those days (with slots) come back — see getAvailableSlots. */
const BLOCKS_MAX_DAYS_PER_DOCTOR = BLOCKS_SCAN_DAYS;

export interface AgendaBlock {
  doctor: Doctor;
  /** YYYY-MM-DD, America/Sao_Paulo. */
  date: string;
  period: Period;
  /** ISO of the earliest slot in the block — sort key. */
  blockStart: string;
  slots: { time: string }[];
}

export interface NextAgendaBlocksResult {
  blocks: AgendaBlock[];
  /** True when nothing matched the triage's chosen periods, so these are
   * the nearest blocks in ANY period instead (Entrega 3, item 2). */
  usedFallback: boolean;
}

/**
 * Doctors eligible by symptom (symptom_doctor_map) — NOT the same matching
 * as Entrega 1's resolveDoctorForSchedule, which matches by doctor_availability
 * (weekday/period) instead. Entrega 3 asks explicitly for symptom-based
 * candidacy; falls back to every active doctor when none of the selected
 * symptoms have an explicit mapping row, so an unmapped symptom never
 * empties the candidate pool.
 */
async function getSymptomMatchedDoctors(symptoms: string[]): Promise<Doctor[]> {
  if (symptoms.length === 0) return getActiveDoctors();

  const supabase = createServiceClient();
  const DOCTOR_COLUMNS =
    "id, name, crm, crm_uf, specialties, bio_short, photo_url, email, calcom_event_type_slug, calcom_event_type_id, global_priority, handles_minors, handles_elderly, is_active, medical_specialty";

  const { data, error } = await supabase
    .from("symptom_doctor_map")
    .select(`priority, symptoms!inner(slug), doctors!inner(${DOCTOR_COLUMNS})`)
    .in("symptoms.slug", symptoms)
    .eq("doctors.is_active", true);

  if (error || !data || data.length === 0) {
    return getActiveDoctors();
  }

  const seen = new Set<string>();
  const doctors: Doctor[] = [];
  for (const row of data) {
    const doctor = row.doctors as unknown as Doctor;
    if (seen.has(doctor.id)) continue;
    seen.add(doctor.id);
    doctors.push(doctor);
  }
  return doctors;
}

function applySpecialRules(doctors: Doctor[], symptoms: string[], isMinor: boolean): Doctor[] {
  let result = doctors;
  if (symptoms.includes("autismo")) {
    result = result.filter((d) => !AUTISM_EXCLUDED_DOCTOR_IDS.includes(d.id));
  }
  if (isMinor) {
    result = result.filter((d) => d.handles_minors);
  }
  return result;
}

/**
 * Builds every (médico, dia, período) block with at least one free Cal.com
 * slot, across all eligible candidates, sorted by block start ascending
 * (ties broken by doctor global_priority). Used both for the "chosen
 * periods" pass and the "any period" fallback pass — callers filter/slice.
 */
async function buildAllBlocks(candidates: Doctor[]): Promise<AgendaBlock[]> {
  const perDoctor = await Promise.all(
    candidates.map(async (doctor) => {
      if (!doctor.calcom_event_type_id) return { doctor, days: [] as { date: string; slots: { time: string }[] }[] };
      const days = await getAvailableSlots(doctor.calcom_event_type_id, BLOCKS_SCAN_DAYS, BLOCKS_MAX_DAYS_PER_DOCTOR);
      return { doctor, days };
    })
  );

  const blockMap = new Map<string, AgendaBlock>();
  for (const { doctor, days } of perDoctor) {
    for (const day of days) {
      for (const slot of day.slots) {
        const period = classifyPeriod(slot.time);
        const key = `${doctor.id}|${day.date}|${period}`;
        const existing = blockMap.get(key);
        if (existing) {
          existing.slots.push({ time: slot.time });
          if (slot.time < existing.blockStart) existing.blockStart = slot.time;
        } else {
          blockMap.set(key, { doctor, date: day.date, period, blockStart: slot.time, slots: [{ time: slot.time }] });
        }
      }
    }
  }

  const blocks = Array.from(blockMap.values());
  for (const block of blocks) block.slots.sort((a, b) => a.time.localeCompare(b.time));
  blocks.sort(
    (a, b) => a.blockStart.localeCompare(b.blockStart) || a.doctor.global_priority - b.doctor.global_priority
  );
  return blocks;
}

/**
 * Entrega 3 — "Esses são os melhores médicos para você": the 3 nearest
 * (médico, dia, período) blocks matching the triage's chosen days/periods,
 * among symptom-eligible doctors (special rules applied). Falls back to
 * the 3 nearest blocks in ANY period when none match (item 2).
 */
export async function getNextAgendaBlocks(
  chosenSlots: ScheduleSlot[],
  symptoms: string[] = [],
  isMinor = false
): Promise<NextAgendaBlocksResult> {
  const candidates = applySpecialRules(await getSymptomMatchedDoctors(symptoms), symptoms, isMinor);
  if (candidates.length === 0) return { blocks: [], usedFallback: false };

  const allBlocks = await buildAllBlocks(candidates);

  const chosenKeys = new Set(chosenSlots.map((s) => `${s.weekday}-${s.period}`));
  const weekdayOf = (dateStr: string): number => {
    // date is YYYY-MM-DD in America/Sao_Paulo already (from getAvailableSlots' day bucketing).
    return new Date(`${dateStr}T12:00:00`).getDay();
  };

  const matching = chosenKeys.size
    ? allBlocks.filter((b) => chosenKeys.has(`${weekdayOf(b.date)}-${b.period}`))
    : [];

  if (matching.length > 0) {
    return { blocks: matching.slice(0, 3), usedFallback: false };
  }
  return { blocks: allBlocks.slice(0, 3), usedFallback: true };
}
