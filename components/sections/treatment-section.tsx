"use client";

import { CheckCircle2, Droplets } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";

const bullets = [
  "Orientação clara sobre cada etapa",
  "Discrição no atendimento",
  "Acompanhamento estruturado",
];

export function TreatmentSection() {
  return (
    <Section id="tratamento" bg="white">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Imagem / placeholder */}
        <FadeUp>
          <div className="mx-auto flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-2xl bg-brand-sand/60">
            <Droplets className="h-20 w-20 text-brand-forest-light/50" />
          </div>
        </FadeUp>

        {/* Texto */}
        <FadeUp delay={0.15}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
              Tratamento consciente, com discrição e acompanhamento
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-text-secondary sm:text-lg">
              Cada etapa do processo é conduzida com atenção individualizada,
              respeitando seu tempo e sua privacidade.
            </p>
            <ul className="mt-6 space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-forest" />
                  <span className="text-sm text-brand-text sm:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </div>
    </Section>
  );
}
