"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { saveTriageData, loadTriageData } from "@/lib/triagem/storage";
import { matchDoctor } from "@/lib/triagem/matcher";
import { StepSymptoms } from "@/components/fluxo/step-symptoms";
import { StepBirthDate } from "@/components/fluxo/step-birthdate";
import { StepDuration } from "@/components/fluxo/step-duration";
import { StepTreatment } from "@/components/fluxo/step-treatment";
import { StepCbd } from "@/components/fluxo/step-cbd";
import { ProgressBar } from "@/components/fluxo/progress-bar";
import type { TriageData } from "@/lib/triagem/schemas";

const TOTAL_STEPS = 5;

export default function TriagemPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Partial<TriageData>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadTriageData();
    if (saved.selectedSymptoms?.length) {
      setData(saved);
      if (saved.priorCbdUse) setStep(5);
      else if (saved.priorTreatment) setStep(4);
      else if (saved.duration) setStep(3);
      else if (saved.birthDate) setStep(2);
    }
    setLoaded(true);
  }, []);

  const updateData = useCallback((partial: Partial<TriageData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      saveTriageData(next);
      return next;
    });
  }, []);

  function goNext() {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      const result = matchDoctor(data.selectedSymptoms ?? [], {
        isMinor: data.isMinor,
        isElderly: data.isElderly,
      });
      updateData({ matchedDoctorId: result.doctor.id });
      router.push("/triagem/resultado");
    }
  }

  function goBack() {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <ProgressBar current={step} total={TOTAL_STEPS} />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8"
          >
            {step === 1 && (
              <StepSymptoms
                selected={data.selectedSymptoms ?? []}
                onSelect={(slugs) => updateData({ selectedSymptoms: slugs })}
                onNext={goNext}
              />
            )}
            {step === 2 && (
              <StepBirthDate
                value={data.birthDate}
                onSelect={(birthDate, isMinor, isElderly) =>
                  updateData({ birthDate, isMinor, isElderly })
                }
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <StepDuration
                value={data.duration}
                onSelect={(v) => updateData({ duration: v })}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <StepTreatment
                value={data.priorTreatment}
                details={data.priorTreatmentDetails}
                onSelect={(v, d) =>
                  updateData({ priorTreatment: v, priorTreatmentDetails: d })
                }
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 5 && (
              <StepCbd
                value={data.priorCbdUse}
                onSelect={(v) => updateData({ priorCbdUse: v })}
                onNext={goNext}
                onBack={goBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
