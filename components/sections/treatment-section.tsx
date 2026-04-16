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
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Imagem */}
        <FadeUp>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1616671276441-2f2c277b8bf6?w=800&q=80"
              alt="Gotejador de óleo CBD — tratamento com canabidiol"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
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
