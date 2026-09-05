"use server";

import { getDoctorCandidatesForSchedule, getActiveDoctors } from "@/app/actions/get-doctors";
import { getAvailableSlots } from "@/lib/calcom/availability";
import type { Doctor } from "@/lib/types/doctor";
import type { ScheduleSlot } from "@/lib/types/availability";

/** How far ahead a candidate needs a free slot to be presented immediately. */
const AVAILABILITY_HORIZON_DAYS = 14;

/** Dra. Carolina Lopes — excluded from routing when the patient flagged "autismo". */
const AUTISM_EXCLUDED_DOCTOR_IDS = ["7b74694a-b8f5-462a-9da2-75ce207ea786"];

export interface ResolveDoctorResult {
  /** The doctor to present, already confirmed to have a slot. Null if nobody does. */
  doctor: Doctor | null;
  /**
   * Set only when `doctor` is null: the top-priority candidate (for
   * messaging/WhatsApp) and, if found, their next available date beyond
   * the 14-day horizon.
   */
  fallback: { doctor: Doctor; nextAvailableDate: string | null } | null;
}

/**
 * Resolves the single doctor to present for a set of selected
 * (weekday, period) slots: candidates ordered by global_priority ASC,
 * Cal.com availability checked for all of them in parallel (never
 * sequential — a spike in traffic shouldn't turn one doctor's check into
 * a queue), winner is the highest-priority candidate that actually has a
 * slot in the next 14 days.
 */
export async function resolveDoctorForSchedule(
  slots: ScheduleSlot[],
  symptoms: string[] = []
): Promise<ResolveDoctorResult> {
  const excludeAutismDoctors = symptoms.includes("autismo");
  const withoutExcluded = (doctors: Doctor[]) =>
    excludeAutismDoctors
      ? doctors.filter((doctor) => !AUTISM_EXCLUDED_DOCTOR_IDS.includes(doctor.id))
      : doctors;

  let candidates = withoutExcluded(await getDoctorCandidatesForSchedule(slots));
  if (candidates.length === 0) candidates = withoutExcluded(await getActiveDoctors());
  if (candidates.length === 0) return { doctor: null, fallback: null };

  const availability = await Promise.all(
    candidates.map(async (doctor) => ({
      doctor,
      days: doctor.calcom_event_type_id
        ? await getAvailableSlots(doctor.calcom_event_type_id, AVAILABILITY_HORIZON_DAYS)
        : [],
    }))
  );

  // availability preserves candidates' priority order — first match wins.
  const winner = availability.find((c) => c.days.length > 0);
  if (winner) return { doctor: winner.doctor, fallback: null };

  const top = candidates[0];
  const widerWindow = top.calcom_event_type_id
    ? await getAvailableSlots(top.calcom_event_type_id)
    : [];

  return {
    doctor: null,
    fallback: { doctor: top, nextAvailableDate: widerWindow[0]?.date ?? null },
  };
}
