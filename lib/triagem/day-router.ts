type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type ShiftKey = "morning" | "afternoon" | "night";

// null = não oferecido (sábado/domingo à noite)
const routingTable: Record<DayKey, Record<ShiftKey, string | null>> = {
  monday:    { morning: "carol",   afternoon: "carol",   night: "brendon" },
  tuesday:   { morning: "carol",   afternoon: "carol",   night: "brendon" },
  wednesday: { morning: "carol",   afternoon: "carol",   night: "brendon" },
  thursday:  { morning: "cleyton", afternoon: "cleyton", night: "brendon" },
  friday:    { morning: "carol",   afternoon: "carol",   night: "brendon" },
  saturday:  { morning: "cleyton", afternoon: "cleyton", night: null },
  sunday:    { morning: "brendon", afternoon: "brendon", night: null },
};

// Lower number = higher priority
const PRIORITY: Record<string, number> = {
  carol:   1,
  cleyton: 2,
  brendon: 3,
};

const FALLBACK = "carol";

export const WEEKEND_DAYS: DayKey[] = ["saturday", "sunday"];

export function routeBySchedule(
  selectedDays: string[],
  selectedShifts: string[]
): string {
  const candidates = new Set<string>();

  for (const day of selectedDays) {
    for (const shift of selectedShifts) {
      const doctorId = routingTable[day as DayKey]?.[shift as ShiftKey];
      if (doctorId) candidates.add(doctorId);
    }
  }

  if (candidates.size === 0) return FALLBACK;

  return [...candidates].sort(
    (a, b) => (PRIORITY[a] ?? 99) - (PRIORITY[b] ?? 99)
  )[0];
}
