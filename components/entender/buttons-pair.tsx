"use client";

import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RichText } from "./rich-text";
import { trackEvent } from "@/lib/analytics/track";
import { CTA_LABEL, CTA_SUBTEXT, CTA_BODY_PARAGRAPHS, SECONDARY_LABEL } from "@/lib/entender/copy";
import { cn } from "@/lib/utils";

interface Props {
  tela: 2 | 4;
  destino: "duvidas" | "whatsapp";
  onAgendar: () => void;
  onIrParaDuvidas?: () => void;
  onAbrirWhatsApp?: () => void;
}

export function ButtonsPair({ tela, destino, onAgendar, onIrParaDuvidas, onAbrirWhatsApp }: Props) {
  function handleCta() {
    trackEvent({ name: "entender_to_agenda", tela });
    onAgendar();
  }

  function handleSecondary() {
    if (destino === "duvidas") {
      trackEvent({ name: "entender_duvidas_abertas" });
      onIrParaDuvidas?.();
    } else {
      trackEvent({ name: "entender_to_whatsapp" });
      onAbrirWhatsApp?.();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleCta}
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold px-8 py-6 text-base shadow-lg shadow-brand-forest/20 transition-all duration-500 sm:w-auto"
        )}
      >
        {CTA_LABEL}
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>

      <p className="text-[17px] font-medium text-brand-text-secondary sm:text-lg">
        <RichText text={CTA_SUBTEXT} />
      </p>

      <div className="max-w-xl space-y-3 text-center">
        {CTA_BODY_PARAGRAPHS.map((p, i) => (
          <p key={i} className="text-[17px] leading-relaxed text-brand-text-secondary sm:text-lg">
            <RichText text={p} />
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSecondary}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "border-brand-forest/20 text-brand-forest hover:bg-brand-forest/5 font-medium"
        )}
      >
        {SECONDARY_LABEL}
      </button>
    </div>
  );
}
