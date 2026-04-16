"use client";

import Link from "next/link";
import {
  Brain, Moon, Activity, Heart, Zap, Shield, Flame, HeadsetIcon,
} from "lucide-react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const condicoes = [
  { label: "Ansiedade e estresse persistente", icon: Brain },
  { label: "Distúrbios do sono", icon: Moon },
  { label: "Dores crônicas", icon: Activity },
  { label: "Regulação emocional", icon: Heart },
  { label: "Condições neurológicas específicas", icon: Zap },
  { label: "Dependência química", icon: Shield },
  { label: "Burnout e sobrecarga mental", icon: Flame },
  { label: "Enxaqueca e dor de cabeça", icon: HeadsetIcon },
];

export function ConditionsSection() {
  return (
    <section id="condicoes" className="bg-brand-forest px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <h2 className="text-center text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl lg:text-4xl">
            Em quais situações o tratamento pode ser avaliado
          </h2>
        </FadeUp>

        <StaggerContainer className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-2">
          {condicoes.map(({ label, icon: Icon }) => (
            <StaggerItem key={label}>
              <div className="flex items-center gap-4 rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-5 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:bg-brand-cream/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cream/10">
                  <Icon className="h-5 w-5 text-brand-cream/80" />
                </div>
                <span className="text-sm font-medium text-brand-cream sm:text-base">
                  {label}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeUp delay={0.3}>
          <div className="mt-12 text-center">
            <Link
              href="/triagem"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-8 py-6 shadow-lg transition-all duration-500"
              )}
              data-track="cta_clicked"
              data-track-section="condicoes"
              data-track-label="entenda_tratamento"
            >
              Entenda se o tratamento é indicado
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
