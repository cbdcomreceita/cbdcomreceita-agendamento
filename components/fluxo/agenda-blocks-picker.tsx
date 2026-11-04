"use client";

import { useState, useEffect, useCallback } from "react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Check, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNextAgendaBlocks, type AgendaBlock } from "@/app/actions/get-next-agenda-blocks";
import { TIMEZONE, formatDateLong, formatTime } from "@/lib/utils/datetime";
import { getDoctorInitials } from "@/lib/utils/doctor";
import { trackEvent } from "@/lib/analytics/track";
import Image from "next/image";
import type { ScheduleSlot } from "@/lib/types/availability";

type PickerState = "loading" | "ready" | "error" | "empty";

const ALT_SLOT_WHATSAPP = `https://wa.me/5584997048210?text=${encodeURIComponent(
  "Olá! Vi os horários disponíveis no site mas nenhum funciona pra mim. Seria possível verificar uma agenda alternativa?"
)}`;

interface AgendaBlocksPickerProps {
  scheduleSlots: ScheduleSlot[];
  symptoms: string[];
  isMinor: boolean;
  onConfirm: (block: AgendaBlock, time: string) => void;
}

export function AgendaBlocksPicker({ scheduleSlots, symptoms, isMinor, onConfirm }: AgendaBlocksPickerProps) {
  const [state, setState] = useState<PickerState>("loading");
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [selected, setSelected] = useState<{ blockIndex: number; time: string } | null>(null);

  // No setState at the top of this function on purpose — PickerState
  // already starts at "loading" (useState above), so the effect-triggered
  // initial call never needs to set it again before its first await. The
  // retry button resets to "loading" itself (a user-event handler, not an
  // effect) before calling this again.
  const fetchBlocks = useCallback(async () => {
    try {
      const result = await getNextAgendaBlocks(scheduleSlots, symptoms, isMinor);
      if (result.blocks.length === 0) {
        setState("empty");
      } else {
        setBlocks(result.blocks);
        setUsedFallback(result.usedFallback);
        setState("ready");
        trackEvent({ name: "calendar_viewed" });
      }
    } catch {
      setState("error");
    }
  }, [scheduleSlots, symptoms, isMinor]);

  useEffect(() => {
    // Same fire-and-forget-async-fetch-on-mount shape as the existing
    // SlotPicker (components/fluxo/slot-picker.tsx's fetchSlots effect),
    // which the same lint rule does not flag — react-compiler's
    // set-state-in-effect heuristic is inconsistent here, not a real issue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlocks();
  }, [fetchBlocks]);

  function retry() {
    setState("loading");
    fetchBlocks();
  }

  function handleConfirm() {
    if (!selected) return;
    const block = blocks[selected.blockIndex];
    onConfirm(block, selected.time);
  }

  if (state === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-brand-sand/60 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-brand-sand/60" />
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-brand-sand/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-brand-sand/40" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-9 w-16 animate-pulse rounded-xl bg-brand-sand/40" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-sand bg-white p-8 text-center">
        <p className="text-base font-medium text-brand-text">Não foi possível carregar os horários</p>
        <div className="flex gap-3">
          <Button onClick={retry} variant="outline" className="border-brand-forest/20 text-brand-forest">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <a href="https://wa.me/5584997048210" target="_blank" rel="noopener noreferrer">
            <Button className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-sand bg-white p-8 text-center">
        <p className="text-base font-medium text-brand-text">Não há horários disponíveis nos próximos dias</p>
        <p className="text-sm text-brand-text-secondary">Entre em contato pelo WhatsApp para agendar manualmente.</p>
        <a href="https://wa.me/5584997048210" target="_blank" rel="noopener noreferrer">
          <Button className="bg-[#25D366] text-white hover:bg-[#20bd5a]">
            <MessageCircle className="mr-2 h-4 w-4" />
            Falar no WhatsApp
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-brand-forest-dark">
        Esses são os melhores médicos para você
      </h2>
      <p className="mt-1 text-sm text-brand-text-secondary">
        {usedFallback
          ? "Não encontramos horários nos períodos escolhidos. Estes são os mais próximos."
          : "Separamos os horários mais próximos dentro dos dias e períodos que você escolheu."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3" data-track="calendar_viewed">
        {blocks.map((block, blockIndex) => {
          const dateObj = parseISO(`${block.date}T12:00:00`);
          const dayLabel = formatInTimeZone(dateObj, TIMEZONE, "EEEE", { locale: ptBR });
          const dateLabel = formatInTimeZone(dateObj, TIMEZONE, "d 'de' MMM", { locale: ptBR });

          return (
            <div key={`${block.doctor.id}-${block.date}-${block.period}`} className="rounded-2xl border border-brand-sand/60 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                {block.doctor.photo_url ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-brand-cream">
                    <Image src={block.doctor.photo_url} alt={`Foto de ${block.doctor.name}`} fill className="object-cover object-top" sizes="48px" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-forest-light text-sm font-bold text-brand-cream">
                    {getDoctorInitials(block.doctor.name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-brand-forest-dark">{block.doctor.name}</p>
                  {block.doctor.medical_specialty && (
                    <p className="text-xs font-medium text-brand-forest">{block.doctor.medical_specialty}</p>
                  )}
                  {block.doctor.crm && (
                    <p className="text-[11px] text-brand-text-muted">CRM-{block.doctor.crm_uf} {block.doctor.crm}</p>
                  )}
                </div>
              </div>
              <div className="mb-2 text-center">
                <p className="text-sm font-semibold capitalize text-brand-forest-dark">{dayLabel}</p>
                <p className="text-xs text-brand-text-muted">{dateLabel}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {block.slots.map((slot) => {
                  const timeStr = formatTime(slot.time);
                  const isSelected = selected?.blockIndex === blockIndex && selected.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelected({ blockIndex, time: slot.time })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-300",
                        isSelected
                          ? "bg-brand-forest text-brand-cream shadow-sm"
                          : "bg-brand-cream/60 text-brand-forest-dark hover:bg-brand-forest/10"
                      )}
                      data-track="slot_selected"
                      data-track-time={timeStr}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {timeStr}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="mt-6 rounded-2xl border border-brand-forest/20 bg-brand-forest/5 p-5">
          <p className="text-sm font-semibold text-brand-forest-dark">
            {formatDateLong(selected.time)} — {blocks[selected.blockIndex].doctor.name}
          </p>
          <Button
            onClick={handleConfirm}
            className="mt-4 w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold py-5 shadow-lg shadow-brand-forest/20 transition-all duration-500"
          >
            Confirmar e prosseguir
          </Button>
        </div>
      )}

      <div className="mt-10 border-t border-brand-sand/60 pt-8 text-center">
        <p className="text-sm text-brand-text-secondary">Nenhum horário funciona pra você?</p>
        <a
          href={ALT_SLOT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-forest/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-forest/8"
          data-track="cta_clicked"
          data-track-section="agenda"
          data-track-label="solicitar_horario_alternativo"
          onClick={() => trackEvent({ name: "whatsapp_click", origem: "agenda-horario-alternativo" })}
        >
          <MessageCircle className="h-4 w-4" />
          Solicitar horário alternativo
        </a>
      </div>
    </div>
  );
}
