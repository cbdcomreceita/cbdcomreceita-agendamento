"use client";

import { Leaf } from "lucide-react";
import { SelectableCard } from "./selectable-card";
import { StepNav } from "./step-nav";
import type { Step4Data } from "@/lib/triagem/schemas";

const options: { value: Step4Data["priorCbdUse"]; label: string }[] = [
  { value: "never", label: "Nunca" },
  { value: "with_prescription", label: "Sim, com prescrição médica" },
  { value: "self", label: "Sim, por conta própria" },
  { value: "prefer_not_say", label: "Prefiro não dizer" },
];

interface Props {
  value?: Step4Data["priorCbdUse"];
  onSelect: (v: Step4Data["priorCbdUse"]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCbd({ value, onSelect, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Você já usou CBD antes?
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => onSelect(opt.value)}
            icon={<Leaf className="h-4 w-4 text-brand-forest" />}
            role="radio"
          />
        ))}
      </div>

      <StepNav
        onNext={onNext}
        onBack={onBack}
        nextLabel="Ver meu médico indicado"
        nextDisabled={!value}
      />
    </div>
  );
}
