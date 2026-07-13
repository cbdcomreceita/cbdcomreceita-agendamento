"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { saveTriageData, loadTriageData } from "@/lib/triagem/storage";
import { loadBookingData } from "@/lib/calcom/storage";
import { trackEvent } from "@/lib/analytics/track";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { StepBirthDate } from "@/components/fluxo/step-birthdate";
import { StepDuration } from "@/components/fluxo/step-duration";
import { StepCbd } from "@/components/fluxo/step-cbd";
import { StepMedication } from "@/components/fluxo/step-medication";
import { ProgressBar } from "@/components/fluxo/progress-bar";
import type { TriageData } from "@/lib/triagem/schemas";

const TOTAL_STEPS = 4;

export default function TriagemCompletaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Partial<TriageData>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadTriageData();
    const booking = loadBookingData();
    if (!saved.selectedSymptoms?.length || !saved.matchedDoctorId || !booking) {
      router.replace("/triagem");
      return;
    }
    setData(saved);
    if (saved.hasCurrentMedication !== undefined) setStep(4);
    else if (saved.priorCbdUse) setStep(3);
    else if (saved.duration) setStep(2);
    setLoaded(true);
    trackEvent({ name: "triagem_completa_started" });
  }, [router]);

  const updateData = useCallback((partial: Partial<TriageData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      saveTriageData(next);
      return next;
    });
  }, []);

  function goNext() {
    trackEvent({ name: "triagem_completa_step_completed", step });
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      router.push("/dados");
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
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="triagem-completa" />

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
            <StepBirthDate
              value={data.birthDate}
              onSelect={(birthDate, isMinor, isElderly) =>
                updateData({ birthDate, isMinor, isElderly })
              }
              onNext={goNext}
            />
          )}
          {step === 2 && (
            <StepDuration
              value={data.duration}
              onSelect={(v) => updateData({ duration: v })}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <StepCbd
              value={data.priorCbdUse}
              onSelect={(v) => updateData({ priorCbdUse: v })}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepMedication
              hasMedication={data.hasCurrentMedication}
              medications={data.currentMedications}
              onSelectHasMedication={(v) => updateData({ hasCurrentMedication: v })}
              onChangeMedications={(v) => updateData({ currentMedications: v })}
              onNext={goNext}
              onBack={goBack}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
