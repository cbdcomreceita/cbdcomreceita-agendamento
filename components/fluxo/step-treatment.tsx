"use client";

import { useState, useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SelectableCard } from "./selectable-card";
import { StepNav } from "./step-nav";
import type { Step3Data } from "@/lib/triagem/schemas";

const options: { value: Step3Data["priorTreatment"]; label: string }[] = [
  { value: "never", label: "Não, nunca" },
  { value: "medication", label: "Sim, com medicação" },
  { value: "therapy", label: "Sim, com terapia" },
  { value: "other", label: "Sim, outros" },
];

interface Props {
  value?: Step3Data["priorTreatment"];
  details?: string;
  onSelect: (v: Step3Data["priorTreatment"], details?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTreatment({ value, details, onSelect, onNext, onBack }: Props) {
  const [localDetails, setLocalDetails] = useState(details ?? "");
  const showDetails = value && value !== "never";

  useEffect(() => {
    if (!showDetails) setLocalDetails("");
  }, [showDetails]);

  function handleSelect(v: Step3Data["priorTreatment"]) {
    onSelect(v, v === "never" ? undefined : localDetails);
  }

  function handleDetailsChange(text: string) {
    setLocalDetails(text);
    if (value) onSelect(value, text);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Já fez algum tratamento pra isso?
      </h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => handleSelect(opt.value)}
            icon={<Stethoscope className="h-4 w-4 text-brand-forest" />}
            role="radio"
          />
        ))}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <label
                htmlFor="treatment-details"
                className="mb-2 block text-sm font-medium text-brand-text-secondary"
              >
                Qual tratamento ou medicação?
              </label>
              <textarea
                id="treatment-details"
                value={localDetails}
                onChange={(e) => handleDetailsChange(e.target.value)}
                placeholder="Descreva brevemente..."
                rows={3}
                className="w-full rounded-xl border-2 border-brand-sand/60 bg-white px-4 py-3 text-sm text-brand-text placeholder:text-brand-text-muted/50 transition-colors focus:border-brand-forest focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StepNav onNext={onNext} onBack={onBack} nextDisabled={!value} />
    </div>
  );
}
