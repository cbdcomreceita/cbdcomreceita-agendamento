import type { Weekday, Period } from "@/lib/types/availability";

const WEEKDAY_BY_DAY: Record<string, Weekday> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const PERIOD_BY_SHIFT: Record<string, Period> = {
  morning: "manha",
  afternoon: "tarde",
  night: "noite",
};

export const WEEKEND_DAYS = ["saturday", "sunday"];

export function toWeekdays(days: string[]): Weekday[] {
  return days
    .map((d) => WEEKDAY_BY_DAY[d])
    .filter((w): w is Weekday => w !== undefined);
}

export function toPeriods(shifts: string[]): Period[] {
  return shifts
    .map((s) => PERIOD_BY_SHIFT[s])
    .filter((p): p is Period => p !== undefined);
}
