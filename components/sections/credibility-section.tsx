"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";

export function CredibilitySection() {
  return (
    <Section id="credibilidade" bg="white" className="relative overflow-hidden">
      {/* Background image — subtle, right side on desktop */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-[0.07] lg:block">
        <Image
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80"
          alt=""
          fill
          className="object-cover"
          sizes="33vw"
        />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
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
