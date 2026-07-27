"use client";

import { HelpCircle } from "lucide-react";
import { SelectableCard } from "@/components/fluxo/selectable-card";
import { StepNav } from "@/components/fluxo/step-nav";
import { BackLink } from "./back-link";
import {
  TELA3_TITLE,
  TELA3_SUBTITLE,
  DUVIDA_OPTIONS,
  VER_RESPOSTAS_LABEL,
  OUTRO_PLACEHOLDER,
  type DuvidaId,
} from "@/lib/entender/copy";

interface Props {
  selecionadas: DuvidaId[];
  onToggle: (id: DuvidaId) => void;
  outroTexto: string;
  onOutroTextoChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function Tela3({
  selecionadas,
  onToggle,
  outroTexto,
  onOutroTextoChange,
  onBack,
  onContinue,
}: Props) {
  const outroSelecionado = selecionadas.includes("outro");

  return (
    <div>
      <BackLink onClick={onBack} />

      <h2 className="text-xl font-bold tracking-tight text-brand-forest-dark sm:text-2xl">
        {TELA3_TITLE}
      </h2>
      <p className="mt-1 text-sm text-brand-text-secondary">{TELA3_SUBTITLE}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {DUVIDA_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            label={opt.label}
            selected={selecionadas.includes(opt.id)}
            onClick={() => onToggle(opt.id)}
            icon={<HelpCircle className="h-4 w-4 text-brand-forest" />}
          />
        ))}
      </div>

      {outroSelecionado && (
        <div className="mt-4">
          <label htmlFor="outro-texto" className="mb-1.5 block text-sm font-medium text-brand-text">
            {OUTRO_PLACEHOLDER}
          </label>
          <textarea
            id="outro-texto"
            value={outroTexto}
            onChange={(e) => onOutroTextoChange(e.target.value)}
            placeholder={OUTRO_PLACEHOLDER}
            rows={3}
            className="w-full rounded-xl border-2 border-brand-sand/60 bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:border-brand-forest focus:outline-none"
          />
        </div>
      )}

      <StepNav
        onNext={onContinue}
        nextLabel={VER_RESPOSTAS_LABEL}
        nextDisabled={selecionadas.length === 0}
      />
    </div>
  );
}
