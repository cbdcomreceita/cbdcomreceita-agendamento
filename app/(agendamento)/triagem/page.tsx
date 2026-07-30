"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { saveTriageData, loadTriageData } from "@/lib/triagem/storage";
import { loadEntenderRespostas, clearEntenderRespostas } from "@/lib/entender/storage";
import { toWeekdays, toPeriods } from "@/lib/triagem/schedule";
import { getDoctorForSchedule, getActiveDoctors } from "@/app/actions/get-doctors";
import { trackEvent } from "@/lib/analytics/track";
import { StepSymptoms } from "@/components/fluxo/step-symptoms";
import { StepSchedule } from "@/components/fluxo/step-schedule";
import { ProgressBar } from "@/components/fluxo/progress-bar";
import type { TriageData } from "@/lib/triagem/schemas";

const TOTAL_STEPS = 2;

export default function TriagemPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Partial<TriageData>>({});
  const [loaded, setLoaded] = useState(false);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    const saved = loadTriageData();
    const entender = loadEntenderRespostas();

    let merged: Partial<TriageData> = saved;

    if (entender) {
      const fromEntender: Partial<TriageData> = {
        selectedSymptoms: entender.sintomas,
      };
      merged = { ...fromEntender, ...saved };
      saveTriageData(merged);
      clearEntenderRespostas();
    }

    if (merged.selectedSymptoms?.length) {
      setData(merged);
      setStep(2);
    }
    setLoaded(true);
    trackEvent({ name: "quiz_started" });
  }, []);

  const updateData = useCallback((partial: Partial<TriageData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      saveTriageData(next);
      return next;
    });
  }, []);

  async function goNext() {
    trackEvent({ name: "triagem_step_completed", step });
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }

    setRouting(true);
    try {
      const weekdays = toWeekdays(data.selectedDays ?? []);
      const periods = toPeriods(data.selectedShifts ?? []);
      const doctor =
        (await getDoctorForSchedule(weekdays, periods)) ??
        (await getActiveDoctors())[0] ??
        null;

      if (!doctor) return;

      updateData({ matchedDoctorId: doctor.id });
      router.push("/agenda");
    } finally {
      setRouting(false);
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
              <StepSchedule
                selectedDays={data.selectedDays ?? []}
                selectedShifts={data.selectedShifts ?? []}
                onChangeDays={(days) => updateData({ selectedDays: days })}
                onChangeShifts={(shifts) => updateData({ selectedShifts: shifts })}
                onNext={goNext}
                onBack={goBack}
                loading={routing}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
