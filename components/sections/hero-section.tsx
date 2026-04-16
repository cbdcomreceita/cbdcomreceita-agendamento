"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const badges = [
  "Avaliação médica individualizada",
  "Prescrição responsável",
  "Condução regulatória estruturada",
  "Entrega domiciliar segura",
];

export function HeroSection() {
  return (
    <section className="relative bg-brand-forest px-4 py-20 sm:px-6 sm:py-28 lg:py-36 overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-forest-dark/40 via-transparent to-brand-forest-light/20" />

      <div className="relative mx-auto max-w-4xl text-center">
        <FadeUp>
          <h1 className="text-3xl font-bold tracking-tight text-brand-cream sm:text-4xl lg:text-5xl xl:text-6xl">
            Plataforma médica estruturada para tratamento com CBD
          </h1>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-cream/85 sm:text-lg sm:leading-relaxed">
            Da avaliação clínica à entrega domiciliar, estruturamos todo o
            processo com critério médico e conformidade regulatória.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/triagem"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-8 py-6 sm:w-auto"
              )}
              data-track="cta_clicked"
              data-track-section="hero"
              data-track-label="agendar_avaliacao"
            >
              Agendar Avaliação com Prescritor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/5584997048210"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full border-brand-cream/40 bg-transparent text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream text-base px-8 py-6 sm:w-auto"
              )}
              data-track="cta_clicked"
              data-track-section="hero"
              data-track-label="ja_tenho_prescricao"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Já tenho prescrição
            </a>
          </div>
        </FadeUp>

        <StaggerContainer className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {badges.map((badge) => (
            <StaggerItem key={badge}>
              <span className="inline-flex items-center rounded-full border border-brand-cream/20 bg-brand-cream/10 px-4 py-2 text-xs font-semibold tracking-wide text-brand-cream sm:text-sm">
                {badge}
              </span>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
