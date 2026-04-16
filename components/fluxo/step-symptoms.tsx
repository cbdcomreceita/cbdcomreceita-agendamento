"use client";

import { useState } from "react";
import {
  Brain, Moon, Activity, Heart, Zap, Shield, Flame,
  AlertTriangle, Cigarette, Scale, Pill,
} from "lucide-react";
import { sintomas, type Sintoma } from "@/data/sintomas";
import { SelectableCard } from "./selectable-card";
import { StepNav } from "./step-nav";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  ansiedade: <Brain className="h-4 w-4 text-brand-forest" />,
  insonia: <Moon className="h-4 w-4 text-brand-forest" />,
  estresse: <Brain className="h-4 w-4 text-brand-forest" />,
  "mente-acelerada": <Zap className="h-4 w-4 text-brand-forest" />,
  burnout: <Flame className="h-4 w-4 text-brand-forest" />,
  depressao: <Heart className="h-4 w-4 text-brand-forest" />,
  enxaqueca: <Activity className="h-4 w-4 text-brand-forest" />,
  "tremor-essencial": <Zap className="h-4 w-4 text-brand-forest" />,
  panico: <AlertTriangle className="h-4 w-4 text-brand-forest" />,
  tdah: <Brain className="h-4 w-4 text-brand-forest" />,
  "perda-de-peso": <Scale className="h-4 w-4 text-brand-forest" />,
  "dores-corpo": <Activity className="h-4 w-4 text-brand-forest" />,
  fibromialgia: <Activity className="h-4 w-4 text-brand-forest" />,
  epilepsia: <Zap className="h-4 w-4 text-brand-forest" />,
  autismo: <Heart className="h-4 w-4 text-brand-forest" />,
  alcoolismo: <Shield className="h-4 w-4 text-brand-forest" />,
  obesidade: <Scale className="h-4 w-4 text-brand-forest" />,
  tabagismo: <Cigarette className="h-4 w-4 text-brand-forest" />,
  parkinson: <Pill className="h-4 w-4 text-brand-forest" />,
};

interface Props {
  selected: string[];
  onSelect: (slugs: string[]) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function StepSymptoms({ selected, onSelect, onNext, onBack }: Props) {
  const [emergencyDismissed, setEmergencyDismissed] = useState(false);

  const regular = sintomas.filter((s) => !s.isEmergency).sort((a, b) => a.displayOrder - b.displayOrder);
  const emergency = sintomas.filter((s) => s.isEmergency);

  const selectedEmergency = emergency.filter((s) => selected.includes(s.slug));
  const showEmergencyWarning = selectedEmergency.length > 0 && !emergencyDismissed;

  function toggle(slug: string) {
    if (selected.includes(slug)) {
      onSelect(selected.filter((s) => s !== slug));
    } else {
      onSelect([...selected, slug]);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        O que mais tem te incomodado?
      </h2>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        Selecione um ou mais sintomas
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2"
        data-track="triagem_started"
      >
        {regular.map((s) => (
          <SelectableCard
            key={s.slug}
            label={s.label}
            selected={selected.includes(s.slug)}
            onClick={() => toggle(s.slug)}
            icon={iconMap[s.slug]}
          />
        ))}
      </div>

      {/* Emergency section */}
      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
          Situações que precisam de atenção imediata
        </p>
        <div className="grid gap-3">
          {emergency.map((s) => (
            <SelectableCard
              key={s.slug}
              label={s.label}
              selected={selected.includes(s.slug)}
              onClick={() => toggle(s.slug)}
              icon={<AlertTriangle className="h-4 w-4 text-brand-error" />}
            />
          ))}
        </div>
      </div>

      {/* Emergency warning */}
      {showEmergencyWarning && (
        <div
          className="mt-6 rounded-2xl border border-brand-warning/30 bg-brand-warning/5 p-5"
          data-track="triagem_emergency_shown"
        >
          {selectedEmergency.map((s) => (
            <p key={s.slug} className="text-sm leading-relaxed text-brand-text">
              {s.emergencyMessage}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setEmergencyDismissed(true)}
            className={cn(
              "mt-4 rounded-xl border border-brand-forest/20 bg-white px-5 py-2.5 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-forest/5"
            )}
          >
            Entendi, quero seguir com o agendamento
          </button>
        </div>
      )}

      <StepNav
        onNext={onNext}
        onBack={onBack}
        nextDisabled={selected.length === 0 || (selectedEmergency.length > 0 && !emergencyDismissed)}
      />
    </div>
  );
}
