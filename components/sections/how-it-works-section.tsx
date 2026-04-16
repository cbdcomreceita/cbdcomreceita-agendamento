"use client";

import Link from "next/link";
import { ArrowRight, Stethoscope, FileCheck, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const steps = [
  {
    number: "01",
    title: "Avaliação médica",
    description:
      "Consulta individualizada com médico prescritor. Valor da avaliação inicial: R\u00A049,90",
    icon: Stethoscope,
  },
  {
    number: "02",
    title: "Organização regulatória",
    description: "Orientação estruturada quando aplicável",
    icon: FileCheck,
  },
  {
    number: "03",
    title: "Entrega e acompanhamento",
    description: "Condução responsável até a entrega domiciliar",
    icon: Truck,
  },
];

export function HowItWorksSection() {
  return (
    <Section id="como-funciona" bg="sand">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
          Como funciona
        </h2>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        {steps.map(({ number, title, description, icon: Icon }) => (
          <StaggerItem key={number}>
            <div className="flex flex-col items-center rounded-2xl bg-white/60 p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-md sm:p-10">
              <span className="text-5xl font-bold tracking-tight text-brand-forest-light/40 sm:text-6xl">
                {number}
              </span>
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-forest/8">
                <Icon className="h-6 w-6 text-brand-forest" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-brand-forest-dark">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-text-secondary">
                {description}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeUp delay={0.3}>
        <div className="mt-14 text-center">
          <Link
            href="/triagem"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold text-base px-10 py-6 shadow-lg shadow-brand-forest/20 transition-all duration-500"
            )}
            data-track="cta_clicked"
            data-track-section="como-funciona"
            data-track-label="agendar_avaliacao"
          >
            Agendar Avaliação com Prescritor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </FadeUp>
    </Section>
  );
}
