"use client";

import { SelectableCard } from "./selectable-card";
import { StepNav } from "./step-nav";

interface Props {
  hasMedication?: boolean;
  medications?: string;
  onSelectHasMedication: (v: boolean) => void;
  onChangeMedications: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepMedication({
  hasMedication,
  medications,
  onSelectHasMedication,
  onChangeMedications,
  onNext,
  onBack,
}: Props) {
  const isValid =
    hasMedication === false ||
    (hasMedication === true && !!medications?.trim());

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Você toma algum medicamento para esses sintomas?
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SelectableCard
          label="Sim"
          selected={hasMedication === true}
          onClick={() => onSelectHasMedication(true)}
          role="radio"
        />
        <SelectableCard
          label="Não"
          selected={hasMedication === false}
          onClick={() => {
            onSelectHasMedication(false);
            onChangeMedications("");
          }}
          role="radio"
        />
      </div>

      {hasMedication === true && (
        <div className="mt-6">
          <label htmlFor="currentMedications" className="mb-1.5 block text-sm font-medium text-brand-text">
            Qual medicamento?
          </label>
          <input
            id="currentMedications"
            value={medications ?? ""}
            onChange={(e) => onChangeMedications(e.target.value)}
            placeholder="Nome do medicamento"
            className="w-full rounded-xl border-2 border-brand-sand/60 bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:border-brand-forest focus:outline-none"
          />
        </div>
      )}

      <StepNav onNext={onNext} onBack={onBack} nextDisabled={!isValid} />
    </div>
  );
}
