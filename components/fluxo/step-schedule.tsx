"use client";

import { Sun, Sunset, Moon } from "lucide-react";
import { StepNav } from "./step-nav";
import { WEEKDAY_LABELS, WEEKDAY_SHORT_LABELS, PERIOD_LABELS } from "@/lib/triagem/schedule";
import type { ScheduleSlot, Period } from "@/lib/types/availability";
import { cn } from "@/lib/utils";

const PERIODS_IN_ORDER: Period[] = ["manha", "tarde", "noite"];

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

  // Group by period (only periods with at least one day are shown), each
  // period's days sorted domingo -> sábado.
  const byPeriod = new Map<Period, ScheduleSlot[]>();
  for (const opt of options) {
    if (!byPeriod.has(opt.period)) byPeriod.set(opt.period, []);
    byPeriod.get(opt.period)!.push(opt);
  }
  for (const list of byPeriod.values()) {
    list.sort((a, b) => a.weekday - b.weekday);
  }

  const periods = PERIODS_IN_ORDER.filter((p) => byPeriod.has(p));
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
        {periods.map((period) => (
          <div key={period}>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-brand-text-secondary">
              {PERIOD_ICON[period]}
              {PERIOD_LABELS[period]}
            </p>
            <div className="flex flex-wrap gap-2">
              {byPeriod.get(period)!.map((opt) => {
                const checked = selectedKeys.has(slotKey(opt));
                return (
                  <button
                    key={slotKey(opt)}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      checked
                        ? "border-brand-forest bg-brand-forest text-brand-cream"
                        : "border-brand-sand bg-white text-brand-text hover:border-brand-forest/40 hover:bg-brand-forest/4"
                    )}
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`${WEEKDAY_LABELS[opt.weekday]} — ${PERIOD_LABELS[opt.period]}`}
                  >
                    {WEEKDAY_SHORT_LABELS[opt.weekday]}
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
