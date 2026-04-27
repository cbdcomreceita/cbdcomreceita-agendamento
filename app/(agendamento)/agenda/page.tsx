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

const ALT_SLOT_WHATSAPP = `https://wa.me/5584997048210?text=${encodeURIComponent(
  "Olá! Vi os horários disponíveis no site mas nenhum funciona pra mim. Seria possível verificar uma agenda alternativa?"
)}`;

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
        duration: 25,
      });

      router.push("/dados");
    },
    [doctor, router]
  );

  if (!loaded || !doctor) return null;

  const hasCalcom = !!doctor.calcomEventTypeId;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="agenda" />

      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Escolha o melhor horário
      </h1>

      <div className="mt-4 space-y-3">
        <DoctorSummary doctor={doctor} />
        <p className="text-sm text-brand-text-muted">
          Duração: 25 minutos&ensp;•&ensp;Valor: <span className="font-semibold text-brand-forest">R$&nbsp;49,90</span>
        </p>
      </div>

      {hasCalcom ? (
        <div className="mt-8">
          <SlotPicker
            eventTypeId={doctor.calcomEventTypeId!}
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

      <div className="mt-10 border-t border-brand-sand/60 pt-8 text-center">
        <p className="text-sm text-brand-text-secondary">
          Nenhum horário funciona pra você?
        </p>
        <a
          href={ALT_SLOT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-forest/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-forest/8"
          data-track="cta_clicked"
          data-track-section="agenda"
          data-track-label="solicitar_horario_alternativo"
        >
          <MessageCircle className="h-4 w-4" />
          Solicitar horário alternativo
        </a>
      </div>
    </div>
  );
}
