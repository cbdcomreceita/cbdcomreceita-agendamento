"use client";

import { Check } from "lucide-react";
import { SelectableCard } from "@/components/fluxo/selectable-card";
import { StepNav } from "@/components/fluxo/step-nav";
import {
  TELA1_TITLE,
  TELA1_SUBTITLE,
  PARA_QUEM_QUESTION,
  PARA_QUEM_OPTIONS,
  SINTOMAS_QUESTION,
  SINTOMAS_SUBTITLE,
  SINTOMA_CHIPS,
  type ParaQuem,
} from "@/lib/entender/copy";
import { cn } from "@/lib/utils";

interface Props {
  paraQuem?: ParaQuem;
  onParaQuem: (v: ParaQuem) => void;
  sintomasSelecionados: string[];
  onToggleSintoma: (id: string) => void;
  onContinue: () => void;
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all duration-300",
        selected
          ? "border-brand-forest bg-brand-forest text-brand-cream"
          : "border-brand-sand/60 bg-white text-brand-text hover:border-brand-forest/30"
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function Tela1({
  paraQuem,
  onParaQuem,
  sintomasSelecionados,
  onToggleSintoma,
  onContinue,
}: Props) {
  const canContinue = !!paraQuem && sintomasSelecionados.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        {TELA1_TITLE}
      </h1>
      <p className="mt-2 text-[17px] leading-relaxed text-brand-text-secondary sm:text-lg">
        {TELA1_SUBTITLE}
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-brand-forest-dark sm:text-2xl">
          {PARA_QUEM_QUESTION}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PARA_QUEM_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              label={opt.label}
              selected={paraQuem === opt.value}
              onClick={() => onParaQuem(opt.value)}
              role="radio"
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-brand-forest-dark sm:text-2xl">
          {SINTOMAS_QUESTION}
        </h2>
        <p className="mt-1 text-sm text-brand-text-secondary">{SINTOMAS_SUBTITLE}</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {SINTOMA_CHIPS.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              selected={sintomasSelecionados.includes(chip.id)}
              onClick={() => onToggleSintoma(chip.id)}
            />
          ))}
        </div>
      </div>

      <StepNav onNext={onContinue} nextDisabled={!canContinue} />
    </div>
  );
}
