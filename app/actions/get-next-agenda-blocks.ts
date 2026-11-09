"use server";

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
 * among every active doctor (every doctor treats every symptom, per
 * product rule — the only exceptions are the special rules below: Dra.
 * Carolina excluded from "autismo", and doctors who don't handle minors
 * excluded when the patient is a minor). `symptoms` is kept as a param
 * only so those special rules can read it; it no longer drives candidacy
 * directly (symptom_doctor_map was Entrega 1's old single-doctor routing
 * concept and doesn't apply here). Falls back to the 3 nearest blocks in
 * ANY period when none match (item 2).
 */
export async function getNextAgendaBlocks(
  chosenSlots: ScheduleSlot[],
  symptoms: string[] = [],
  isMinor = false
): Promise<NextAgendaBlocksResult> {
  const candidates = applySpecialRules(await getActiveDoctors(), symptoms, isMinor);
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
