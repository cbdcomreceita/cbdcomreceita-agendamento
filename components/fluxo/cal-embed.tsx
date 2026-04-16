"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { Loader2, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmbedState = "loading" | "ready" | "error";

interface CalEmbedProps {
  calLink: string;
  onBookingSuccess: (data: Record<string, unknown>) => void;
}

export function CalEmbed({ calLink, onBookingSuccess }: CalEmbedProps) {
  const [state, setState] = useState<EmbedState>("loading");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [key, setKey] = useState(0);

  const setupApi = useCallback(async () => {
    const cal = await getCalApi();
    cal("ui", {
      theme: "light",
      cssVarsPerTheme: {
        light: {
          "cal-brand": "#4e5f50",
          "cal-text": "#2b2b2b",
          "cal-text-emphasis": "#2d3e2f",
          "cal-border-subtle": "#e5e0d4",
          "cal-bg": "#ffffff",
          "cal-bg-emphasis": "#f2efe8",
        },
        dark: {
          "cal-brand": "#4e5f50",
          "cal-text": "#f2efe8",
          "cal-text-emphasis": "#ffffff",
          "cal-border-subtle": "#3e4f40",
          "cal-bg": "#2d3e2f",
          "cal-bg-emphasis": "#3e4f40",
        },
      },
      hideEventTypeDetails: false,
    });
    cal("on", {
      action: "bookingSuccessful",
      callback: (e: { detail: { data: Record<string, unknown> } }) => {
        onBookingSuccess(e.detail.data);
      },
    });
  }, [onBookingSuccess]);

  useEffect(() => {
    setupApi();

    // Timeout fallback
    timeoutRef.current = setTimeout(() => {
      setState((s) => (s === "loading" ? "error" : s));
    }, 15000);

    // Listen for Cal embed ready
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data === "string" && e.data.includes("cal:")) {
        setState("ready");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };
    window.addEventListener("message", onMessage);

    // Also mark ready after a short delay as Cal doesn't always fire a ready event
    const readyFallback = setTimeout(() => setState("ready"), 3000);

    return () => {
      window.removeEventListener("message", onMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(readyFallback);
    };
  }, [key, setupApi]);

  function reload() {
    setState("loading");
    setKey((k) => k + 1);
  }

  return (
    <div className="relative min-h-[500px]">
      {/* Loading skeleton */}
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
          <p className="text-sm text-brand-text-muted">Carregando agenda...</p>
        </div>
      )}

      {/* Error fallback */}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-brand-sand bg-white p-8 text-center">
          <p className="text-base font-medium text-brand-text">
            Não foi possível carregar a agenda
          </p>
          <p className="text-sm text-brand-text-secondary">
            Tente novamente ou entre em contato pelo WhatsApp.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={reload}
              variant="outline"
              className="border-brand-forest/20 text-brand-forest"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar agenda
            </Button>
            <a
              href="https://wa.me/5584997048210"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Cal.com embed */}
      <div
        className={cn(
          "transition-opacity duration-500",
          state === "ready" ? "opacity-100" : "opacity-0"
        )}
        data-track="calendar_viewed"
      >
        <Cal
          key={key}
          calLink={calLink}
          config={{
            layout: "month_view",
            theme: "light",
          }}
          style={{
            width: "100%",
            minHeight: "500px",
            border: "none",
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
}
