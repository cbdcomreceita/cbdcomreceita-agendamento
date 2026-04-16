"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
          <div className="mt-10">
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
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
