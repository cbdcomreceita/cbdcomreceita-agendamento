"use client";

import { useState, useRef, useCallback } from "react";
import { StepNav } from "./step-nav";

function calculateAge(birthDate: string): number | null {
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function formatInputDate(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!d || !m || !y || y < 1900) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getDate() !== d ||
    date.getMonth() !== m - 1 ||
    date.getFullYear() !== y ||
    date > new Date()
  )
    return null;
  return date.toISOString();
}

interface Props {
  value?: string;
  onSelect: (birthDate: string, isMinor: boolean, isElderly: boolean) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepBirthDate({ value, onSelect, onNext, onBack }: Props) {
  const existing = value ? new Date(value) : null;
  const [day, setDay] = useState(existing ? String(existing.getDate()).padStart(2, "0") : "");
  const [month, setMonth] = useState(existing ? String(existing.getMonth() + 1).padStart(2, "0") : "");
  const [year, setYear] = useState(existing ? String(existing.getFullYear()) : "");
  const [age, setAge] = useState<number | null>(
    value ? calculateAge(value) : null
  );
  const [valid, setValid] = useState(!!value);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const recalc = useCallback((d: string, m: string, y: string) => {
    const iso = formatInputDate(d, m, y);
    if (iso) {
      const a = calculateAge(iso);
      setAge(a);
      const isValid = a !== null && a >= 0 && a < 130;
      setValid(isValid);
      if (a !== null && isValid) {
        onSelectRef.current(iso, a < 18, a > 65);
      }
    } else {
      setAge(null);
      setValid(false);
    }
  }, []);

  function handleDay(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    recalc(v, month, year);
    if (v.length === 2) document.getElementById("birth-month")?.focus();
  }

  function handleMonth(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(v);
    recalc(day, v, year);
    if (v.length === 2) document.getElementById("birth-year")?.focus();
  }

  function handleYear(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(v);
    recalc(day, month, v);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Qual a data de nascimento do paciente?
      </h2>
      <p className="mt-2 text-sm text-brand-text-secondary">
        Se você está agendando para outra pessoa, informe a data de nascimento dela.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <div>
          <label htmlFor="birth-day" className="mb-1.5 block text-xs font-medium text-brand-text-muted">
            Dia
          </label>
          <input
            id="birth-day"
            type="text"
            inputMode="numeric"
            placeholder="DD"
            value={day}
            onChange={handleDay}
            className="h-14 w-20 rounded-xl border-2 border-brand-sand/60 bg-white text-center text-lg font-semibold text-brand-forest-dark transition-colors focus:border-brand-forest focus:outline-none"
          />
        </div>
        <span className="mt-6 text-xl text-brand-text-muted">/</span>
        <div>
          <label htmlFor="birth-month" className="mb-1.5 block text-xs font-medium text-brand-text-muted">
            Mês
          </label>
          <input
            id="birth-month"
            type="text"
            inputMode="numeric"
            placeholder="MM"
            value={month}
            onChange={handleMonth}
            className="h-14 w-20 rounded-xl border-2 border-brand-sand/60 bg-white text-center text-lg font-semibold text-brand-forest-dark transition-colors focus:border-brand-forest focus:outline-none"
          />
        </div>
        <span className="mt-6 text-xl text-brand-text-muted">/</span>
        <div>
          <label htmlFor="birth-year" className="mb-1.5 block text-xs font-medium text-brand-text-muted">
            Ano
          </label>
          <input
            id="birth-year"
            type="text"
            inputMode="numeric"
            placeholder="AAAA"
            value={year}
            onChange={handleYear}
            className="h-14 w-28 rounded-xl border-2 border-brand-sand/60 bg-white text-center text-lg font-semibold text-brand-forest-dark transition-colors focus:border-brand-forest focus:outline-none"
          />
        </div>
      </div>

      {age !== null && valid && (
        <p className="mt-4 text-sm text-brand-text-secondary">
          Você tem <span className="font-semibold text-brand-forest">{age} anos</span>
          {age < 18 && (
            <span className="ml-1 text-brand-info">
              — Você será direcionado(a) a um médico especializado no atendimento de crianças e adolescentes
            </span>
          )}
          {age > 65 && (
            <span className="ml-1 text-brand-info">
              — Você será direcionado(a) a um médico especializado no atendimento geriátrico
            </span>
          )}
        </p>
      )}

      <StepNav onNext={onNext} onBack={onBack} nextDisabled={!valid} />
    </div>
  );
}
