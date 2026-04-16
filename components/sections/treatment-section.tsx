"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
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
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        {/* Imagem */}
        <FadeUp>
          <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl">
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/fundo_escritorio.png"
                alt="Ambiente de consultório médico"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Subtle gradient to blend with background */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
            </div>
          </div>
        </FadeUp>

        {/* Texto */}
        <FadeUp delay={0.15}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
              Tratamento consciente, com discrição e acompanhamento
            </h2>
            <p className="mt-6 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
              Cada etapa do processo é conduzida com atenção individualizada,
              respeitando seu tempo e sua privacidade.
            </p>
            <ul className="mt-8 space-y-4">
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
