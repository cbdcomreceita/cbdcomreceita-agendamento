"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Loader2, MessageCircle, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAvailableSlots, type DaySlots } from "@/lib/calcom/availability";

type PickerState = "loading" | "ready" | "error" | "empty";

const RESERVATION_MINUTES = 15;

interface SlotPickerProps {
  eventTypeId: number;
  onConfirm: (slot: { date: string; time: string; timeEnd: string }) => void;
}

export function SlotPicker({ eventTypeId, onConfirm }: SlotPickerProps) {
  const [state, setState] = useState<PickerState>("loading");
  const [days, setDays] = useState<DaySlots[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reservedAt, setReservedAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");

  const fetchSlots = useCallback(async () => {
    setState("loading");
    try {
      const result = await getAvailableSlots(eventTypeId);
      if (result.length === 0) {
        setState("empty");
      } else {
        setDays(result);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, [eventTypeId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Countdown timer for reservation
  useEffect(() => {
    if (!reservedAt) {
      setCountdown("");
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - reservedAt;
      const remaining = RESERVATION_MINUTES * 60 * 1000 - elapsed;
      if (remaining <= 0) {
        setSelectedSlot(null);
        setReservedAt(null);
        setCountdown("");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${String(secs).padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [reservedAt]);

  function selectSlot(time: string) {
    setSelectedSlot(time);
    setReservedAt(Date.now());
  }

  function handleConfirm() {
    if (!selectedSlot) return;
    const dt = parseISO(selectedSlot);
    const endDt = new Date(dt.getTime() + 30 * 60 * 1000);
    onConfirm({
      date: selectedSlot,
      time: selectedSlot,
      timeEnd: endDt.toISOString(),
    });
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-sand bg-white p-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
        <p className="text-sm text-brand-text-muted">Buscando horários disponíveis...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-sand bg-white p-8 text-center">
        <p className="text-base font-medium text-brand-text">
          Não foi possível carregar os horários
        </p>
        <div className="flex gap-3">
          <Button onClick={fetchSlots} variant="outline" className="border-brand-forest/20 text-brand-forest">
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
        <p className="text-base font-medium text-brand-text">
          Não há horários disponíveis nos próximos dias
        </p>
        <p className="text-sm text-brand-text-secondary">
          Entre em contato pelo WhatsApp para agendar manualmente.
        </p>
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
      {/* Days grid */}
      <div className="grid gap-4 sm:grid-cols-3" data-track="calendar_viewed">
        {days.map((day) => {
          const dateObj = parseISO(day.date);
          const dayLabel = format(dateObj, "EEEE", { locale: ptBR });
          const dateLabel = format(dateObj, "d 'de' MMM", { locale: ptBR });

          return (
            <div
              key={day.date}
              className="rounded-2xl border border-brand-sand/60 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 text-center">
                <p className="text-sm font-semibold capitalize text-brand-forest-dark">
                  {dayLabel}
                </p>
                <p className="text-xs text-brand-text-muted">{dateLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => {
                  const t = parseISO(slot.time);
                  const timeStr = format(t, "HH:mm");
                  const isSelected = selectedSlot === slot.time;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => selectSlot(slot.time)}
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

      {/* Selection confirmation */}
      {selectedSlot && (
        <div className="mt-6 rounded-2xl border border-brand-forest/20 bg-brand-forest/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-forest-dark">
                {format(parseISO(selectedSlot), "EEEE, d 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
              {countdown && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-text-muted">
                  <Clock className="h-3 w-3" />
                  Reservado pra você por {countdown}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleConfirm}
            className="mt-4 w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold py-5 shadow-lg shadow-brand-forest/20 transition-all duration-500"
          >
            Confirmar e prosseguir
          </Button>
        </div>
      )}
    </div>
  );
}
