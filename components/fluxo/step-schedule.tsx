"use client";

import { Calendar, Sun, Sunset, Moon } from "lucide-react";
import { StepNav } from "./step-nav";
import { WEEKEND_DAYS } from "@/lib/triagem/day-router";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: "monday",    label: "Segunda-feira" },
  { value: "tuesday",   label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday",  label: "Quinta-feira" },
  { value: "friday",    label: "Sexta-feira" },
  { value: "saturday",  label: "Sábado" },
  { value: "sunday",    label: "Domingo" },
];

const SHIFTS = [
  { value: "morning",   label: "Manhã",  sublabel: "até 12h",   icon: <Sun className="h-4 w-4 text-brand-forest" /> },
  { value: "afternoon", label: "Tarde",  sublabel: "12h–18h",   icon: <Sunset className="h-4 w-4 text-brand-forest" /> },
  { value: "night",     label: "Noite",  sublabel: "18h+",      icon: <Moon className="h-4 w-4 text-brand-forest" /> },
];

const weekendValues = WEEKEND_DAYS as string[];

interface Props {
  selectedDays: string[];
  selectedShifts: string[];
  onChangeDays: (days: string[]) => void;
  onChangeShifts: (shifts: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSchedule({
  selectedDays,
  selectedShifts,
  onChangeDays,
  onChangeShifts,
  onNext,
  onBack,
}: Props) {
  const allSelectedWeekend = selectedDays.length > 0 && selectedDays.every((d) => weekendValues.includes(d));
  const showNight = !allSelectedWeekend;

  function toggleDay(value: string) {
    if (selectedDays.includes(value)) {
      const next = selectedDays.filter((d) => d !== value);
      onChangeDays(next);
      // If switching to weekend-only, drop night shift
      const nextAllWeekend = next.length > 0 && next.every((d) => weekendValues.includes(d));
      if (nextAllWeekend && selectedShifts.includes("night")) {
        onChangeShifts(selectedShifts.filter((s) => s !== "night"));
      }
    } else {
      onChangeDays([...selectedDays, value]);
    }
  }

  function toggleShift(value: string) {
    if (selectedShifts.includes(value)) {
      onChangeShifts(selectedShifts.filter((s) => s !== value));
    } else {
      onChangeShifts([...selectedShifts, value]);
    }
  }

  const visibleShifts = showNight ? SHIFTS : SHIFTS.filter((s) => s.value !== "night");
  const isValid = selectedDays.length > 0 && selectedShifts.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Quando você prefere ser atendido?
      </h2>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        Selecione os dias e turnos de sua preferência. Você pode escolher mais de um.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Dias da semana
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DAYS.map((day) => {
              const checked = selectedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    checked
                      ? "border-brand-forest bg-brand-forest/8 text-brand-forest"
                      : "border-brand-sand bg-white text-brand-text hover:border-brand-forest/40 hover:bg-brand-forest/4"
                  )}
                  role="checkbox"
                  aria-checked={checked}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-brand-forest bg-brand-forest text-white"
                        : "border-brand-sand bg-white"
                    )}
                  >
                    {checked && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
            Turno
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {visibleShifts.map((shift) => {
              const checked = selectedShifts.includes(shift.value);
              return (
                <button
                  key={shift.value}
                  type="button"
                  onClick={() => toggleShift(shift.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-4 py-4 text-center text-sm font-medium transition-colors",
                    checked
                      ? "border-brand-forest bg-brand-forest/8 text-brand-forest"
                      : "border-brand-sand bg-white text-brand-text hover:border-brand-forest/40 hover:bg-brand-forest/4"
                  )}
                  role="checkbox"
                  aria-checked={checked}
                >
                  {shift.icon}
                  <span>{shift.label}</span>
                  <span className="text-xs text-brand-text-muted">{shift.sublabel}</span>
                </button>
              );
            })}
          </div>
          {allSelectedWeekend && (
            <p className="mt-2 text-xs text-brand-text-muted">
              Atendimento noturno não disponível aos sábados e domingos.
            </p>
          )}
        </div>
      </div>

      <StepNav
        onNext={onNext}
        onBack={onBack}
        nextLabel="Ver horários disponíveis"
        nextDisabled={!isValid}
      />
    </div>
  );
}
