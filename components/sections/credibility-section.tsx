"use client";

import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";

export function CredibilitySection() {
  return (
    <Section id="credibilidade" bg="white">
      <div className="mx-auto max-w-2xl text-center">
        <FadeUp>
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-forest/8">
            <ShieldCheck className="h-8 w-8 text-brand-forest" />
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
            Cuidado em saúde exige estrutura
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mt-6 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
            Tratamento com CBD depende de avaliação individualizada, critério
            médico e condução responsável em conformidade regulatória.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="mt-4 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
            Atendimento online, importação estruturada e entrega domiciliar
            segura em todo o Brasil.
          </p>
        </FadeUp>

        {/* Decorative divider */}
        <FadeUp delay={0.4}>
          <div className="mx-auto mt-10 h-px w-16 bg-brand-forest/20" />
        </FadeUp>
      </div>
    </Section>
  );
}
