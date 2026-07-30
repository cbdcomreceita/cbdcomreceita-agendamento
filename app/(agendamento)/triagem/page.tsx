"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveTriageData, loadTriageData } from "@/lib/triagem/storage";
import { loadEntenderRespostas, clearEntenderRespostas } from "@/lib/entender/storage";
import { getScheduleOptions } from "@/app/actions/get-doctors";
import { resolveDoctorForSchedule, type ResolveDoctorResult } from "@/app/actions/resolve-doctor";
import { formatDateLongNoTime } from "@/lib/utils/datetime";
import { trackEvent } from "@/lib/analytics/track";
import { StepSymptoms } from "@/components/fluxo/step-symptoms";
import { StepSchedule } from "@/components/fluxo/step-schedule";
import { ProgressBar } from "@/components/fluxo/progress-bar";
import type { TriageData } from "@/lib/triagem/schemas";
import type { ScheduleSlot } from "@/lib/types/availability";

const TOTAL_STEPS = 2;

const SLOTS_WHATSAPP = `https://wa.me/5584997048210?text=${encodeURIComponent(
  "Olá! Estava tentando agendar minha consulta mas não encontrei horário disponível no site."
)}`;

export default function TriagemPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Partial<TriageData>>({});
  const [loaded, setLoaded] = useState(false);
  const [routing, setRouting] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleSlot[]>([]);
  const [noSlots, setNoSlots] = useState<ResolveDoctorResult["fallback"] | null>(null);

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

    getScheduleOptions().then(setScheduleOptions);
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

    setNoSlots(null);
    setRouting(true);
    try {
      const result = await resolveDoctorForSchedule(data.scheduleSlots ?? []);

      if (!result.doctor) {
        setNoSlots(result.fallback);
        return;
      }

      trackEvent({ name: "doctor_selected", doctor_id: result.doctor.id });
      updateData({ matchedDoctorId: result.doctor.id });
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
              <>
                <StepSchedule
                  options={scheduleOptions}
                  selected={data.scheduleSlots ?? []}
                  onChangeSelected={(slots) => updateData({ scheduleSlots: slots })}
                  onNext={goNext}
                  onBack={goBack}
                  loading={routing}
                />
                {noSlots && (
                  <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-brand-sand bg-white p-6 text-center">
                    <p className="text-sm font-medium text-brand-text">
                      {noSlots.doctor.name} está sem horários livres nos próximos dias.
                    </p>
                    {noSlots.nextAvailableDate && (
                      <p className="text-sm text-brand-text-secondary">
                        Próxima data disponível: {formatDateLongNoTime(`${noSlots.nextAvailableDate}T12:00:00`)}
                      </p>
                    )}
                    <div className="mt-1 flex gap-3">
                      <Button onClick={goNext} variant="outline" className="border-brand-forest/20 text-brand-forest">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar novamente
                      </Button>
                      <a
                        href={SLOTS_WHATSAPP}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent({ name: "whatsapp_click", origem: "triagem-sem-horario" })}
                      >
                        <Button className="bg-[#25D366] text-white hover:bg-[#20bd5a]">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
