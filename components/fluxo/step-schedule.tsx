"use client";

import { Calendar, Sun, Sunset, Moon } from "lucide-react";
import { StepNav } from "./step-nav";
import { WEEKDAY_LABELS, PERIOD_LABELS } from "@/lib/triagem/schedule";
import type { ScheduleSlot, Period } from "@/lib/types/availability";
import { cn } from "@/lib/utils";

const PERIOD_ICON: Record<Period, React.ReactNode> = {
  manha: <Sun className="h-3.5 w-3.5" />,
  tarde: <Sunset className="h-3.5 w-3.5" />,
  noite: <Moon className="h-3.5 w-3.5" />,
};

function slotKey(slot: ScheduleSlot): string {
  return `${slot.weekday}-${slot.period}`;
}

interface Props {
  /** Every (weekday, period) that currently has an active doctor. Nothing outside this list is ever offered. */
  options: ScheduleSlot[];
  selected: ScheduleSlot[];
  onChangeSelected: (slots: ScheduleSlot[]) => void;
  onNext: () => void;
  onBack: () => void;
  /** True while resolving the matched doctor after this step submits. */
  loading?: boolean;
}

export function StepSchedule({
  options,
  selected,
  onChangeSelected,
  onNext,
  onBack,
  loading = false,
}: Props) {
  const selectedKeys = new Set(selected.map(slotKey));

  function toggle(slot: ScheduleSlot) {
    const key = slotKey(slot);
    if (selectedKeys.has(key)) {
      onChangeSelected(selected.filter((s) => slotKey(s) !== key));
    } else {
      onChangeSelected([...selected, slot]);
    }
  }

  // Group by weekday, preserving the server's ordering (weekday, then period).
  const weekdays: number[] = [];
  const byWeekday = new Map<number, ScheduleSlot[]>();
  for (const opt of options) {
    if (!byWeekday.has(opt.weekday)) {
      byWeekday.set(opt.weekday, []);
      weekdays.push(opt.weekday);
    }
    byWeekday.get(opt.weekday)!.push(opt);
  }

  const isValid = selected.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Quando você prefere ser atendido?
      </h2>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        Selecione os dias e turnos de sua preferência. Você pode escolher mais de um.
      </p>

      <div className="mt-6 space-y-5">
        {weekdays.map((weekday) => (
          <div key={weekday}>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {WEEKDAY_LABELS[weekday as ScheduleSlot["weekday"]]}
            </p>
            <div className="flex flex-wrap gap-2">
              {byWeekday.get(weekday)!.map((opt) => {
                const checked = selectedKeys.has(slotKey(opt));
                return (
                  <button
                    key={slotKey(opt)}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                      checked
                        ? "border-brand-forest bg-brand-forest/8 text-brand-forest"
                        : "border-brand-sand bg-white text-brand-text hover:border-brand-forest/40 hover:bg-brand-forest/4"
                    )}
                    role="checkbox"
                    aria-checked={checked}
                  >
                    {PERIOD_ICON[opt.period]}
                    {PERIOD_LABELS[opt.period]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <StepNav
        onNext={onNext}
        onBack={onBack}
        nextLabel="Ver horários disponíveis"
        nextDisabled={!isValid || loading}
      />
    </div>
  );
}
