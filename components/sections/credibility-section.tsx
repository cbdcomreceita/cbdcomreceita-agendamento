"use client";

import { ShieldCheck } from "lucide-react";
import { FadeUp } from "@/components/ui/motion";

export function CredibilitySection() {
  return (
    <section id="credibilidade" className="bg-brand-cream px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <FadeUp>
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-forest/8">
            <ShieldCheck className="h-8 w-8 text-brand-forest" />
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
            O que é CBD e pra que serve?
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mt-6 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
            O CBD (canabidiol) é um composto natural da Cannabis, sem efeito
            psicoativo, usado como tratamento medicinal. É uma das áreas que
            mais crescem na pesquisa científica e na prática médica: ansiedade,
            qualidade do sono, falta de foco, estresse, dores, entre outros
            desequilíbrios do sistema nervoso são os casos mais tratados,
            sempre com avaliação médica individualizada.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="mt-4 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
            Aqui, conectamos paciente, médico prescritor e fornecedor
            internacional de qualidade certificada. Atendimento especializado
            100% online, registro e conformidade regulatória (Anvisa) por
            nossa conta, e entrega do tratamento em todo o Brasil.
          </p>
        </FadeUp>

        <FadeUp delay={0.4}>
          <div className="mx-auto mt-10 h-px w-16 bg-brand-forest/20" />
        </FadeUp>
      </div>
    </section>
  );
}
