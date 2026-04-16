"use client";

import {
  Brain,
  Moon,
  Activity,
  Heart,
  Zap,
  Shield,
  Flame,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const iconMap = {
  Brain,
  Moon,
  Activity,
  Heart,
  Zap,
  Shield,
  Flame,
} as const;

const condicoes = [
  { label: "Ansiedade e estresse persistente", icon: "Brain" as const },
  { label: "Distúrbios do sono", icon: "Moon" as const },
  { label: "Dores crônicas", icon: "Activity" as const },
  { label: "Regulação emocional", icon: "Heart" as const },
  { label: "Condições neurológicas específicas", icon: "Zap" as const },
  { label: "Dependência química", icon: "Shield" as const },
  { label: "Burnout e sobrecarga mental", icon: "Flame" as const },
];

export function ConditionsSection() {
  return (
    <Section id="condicoes" bg="cream">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
          Em quais situações o tratamento pode ser avaliado
        </h2>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        {condicoes.map(({ label, icon }) => {
          const Icon = iconMap[icon];
          return (
            <StaggerItem key={label}>
              <div className="flex items-center gap-4 rounded-xl border border-brand-sand bg-white/60 p-4 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-forest/10">
                  <Icon className="h-5 w-5 text-brand-forest" />
                </div>
                <span className="text-sm font-medium text-brand-text sm:text-base">
                  {label}
                </span>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <FadeUp delay={0.3}>
        <p className="mt-8 text-center text-sm text-brand-text-muted">
          Converse com nossa equipe para entender se o tratamento é indicado
        </p>
      </FadeUp>
    </Section>
  );
}
