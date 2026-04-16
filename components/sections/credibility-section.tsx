"use client";

import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";

export function CredibilitySection() {
  return (
    <Section id="credibilidade" bg="white">
      <div className="mx-auto max-w-3xl text-center">
        <FadeUp>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-forest/10">
            <ShieldCheck className="h-7 w-7 text-brand-forest" />
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
            Cuidado em saúde exige estrutura
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mt-4 text-base leading-relaxed text-brand-text-secondary sm:text-lg">
            Tratamento com CBD depende de avaliação individualizada, critério
            médico e condução responsável em conformidade regulatória.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="mt-3 text-base leading-relaxed text-brand-text-secondary sm:text-lg">
            Atendimento online, importação estruturada e entrega domiciliar
            segura em todo o Brasil.
          </p>
        </FadeUp>
      </div>
    </Section>
  );
}
