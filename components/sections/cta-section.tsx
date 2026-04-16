"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/ui/motion";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-forest via-brand-forest to-brand-forest-dark px-5 py-24 sm:px-8 sm:py-32">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-brand-forest-light/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 top-1/4 h-48 w-48 rounded-full bg-brand-cream/5 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <FadeUp>
          <h2 className="text-3xl font-bold tracking-tight text-brand-cream sm:text-4xl lg:text-5xl">
            Inicie sua avaliação médica com segurança
          </h2>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/triagem"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-lg px-12 py-7 shadow-xl shadow-black/15 transition-all duration-500 hover:scale-[1.02]"
              )}
              data-track="cta_clicked"
              data-track-section="cta-final"
              data-track-label="agendar_avaliacao"
            >
              Começar agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="https://wa.me/5584997048210?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20a%20consulta%20e%20o%20tratamento%20com%20CBD."
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-brand-cream/30 bg-transparent text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream text-base px-8 py-6 transition-all duration-500"
              )}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Tirar dúvidas
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
