"use client";

import { Clock } from "lucide-react";
import { SelectableCard } from "./selectable-card";
import { StepNav } from "./step-nav";
import type { Step2Data } from "@/lib/triagem/schemas";

const options: { value: Step2Data["duration"]; label: string }[] = [
  { value: "less_1m", label: "Menos de 1 mês" },
  { value: "1_6m", label: "1 a 6 meses" },
  { value: "6_12m", label: "6 a 12 meses" },
  { value: "more_1y", label: "Mais de 1 ano" },
];

interface Props {
  value?: Step2Data["duration"];
  onSelect: (v: Step2Data["duration"]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDuration({ value, onSelect, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Há quanto tempo você convive com isso?
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => onSelect(opt.value)}
            icon={<Clock className="h-4 w-4 text-brand-forest" />}
            role="radio"
          />
        ))}
      </div>

      <StepNav onNext={onNext} onBack={onBack} nextDisabled={!value} />
    </div>
  );
}
