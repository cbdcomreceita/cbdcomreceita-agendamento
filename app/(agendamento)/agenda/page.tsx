"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { loadTriageData } from "@/lib/triagem/storage";
import { saveBookingData } from "@/lib/calcom/storage";
import { medicos, type Medico } from "@/data/medicos";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { SlotPicker } from "@/components/fluxo/slot-picker";

export default function AgendaPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Medico | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadTriageData();
    if (!data.matchedDoctorId || !data.selectedSymptoms?.length) {
      router.replace("/triagem");
      return;
    }
    const matched = medicos.find((d) => d.id === data.matchedDoctorId) ?? null;
    setDoctor(matched);
    setLoaded(true);
  }, [router]);

  const handleSlotConfirm = useCallback(
    (slot: { date: string; time: string; timeEnd: string }) => {
      if (!doctor) return;

      saveBookingData({
        doctorId: doctor.id,
        doctorName: doctor.name,
        scheduledAt: slot.time,
        scheduledEndAt: slot.timeEnd,
        duration: 30,
      });

      router.push("/dados");
    },
    [doctor, router]
  );

  if (!loaded || !doctor) return null;

  const hasCalcom = !!doctor.calcomSlug && doctor.id === "carol";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="agenda" />

      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Escolha o melhor horário
      </h1>

      <div className="mt-4">
        <DoctorSummary doctor={doctor} />
      </div>

      {hasCalcom ? (
        <div className="mt-8">
          <SlotPicker
            eventTypeSlug={doctor.calcomSlug}
            onConfirm={handleSlotConfirm}
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-brand-sand bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-base font-medium text-brand-text">
            {doctor.name} estará disponível em breve
          </p>
          <p className="mt-2 text-sm text-brand-text-secondary">
            Por enquanto, agende sua consulta diretamente com nossa equipe via
            WhatsApp.
          </p>
          <a
            href="https://wa.me/5584997048210"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
