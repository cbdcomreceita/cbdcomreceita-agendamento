"use client";

import { ShieldCheck, Award, Search, Package } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const cards = [
  {
    icon: ShieldCheck,
    title: "Conformidade regulatória",
    description: "Processos alinhados às normas da Anvisa e órgãos reguladores.",
  },
  {
    icon: Award,
    title: "Critérios internacionais de qualidade",
    description: "Produtos de fabricantes que seguem padrões globais de produção.",
  },
  {
    icon: Search,
    title: "Controle de origem e rastreabilidade",
    description: "Rastreamento completo desde a fabricação até a entrega.",
  },
  {
    icon: Package,
    title: "Entrega domiciliar segura",
    description: "Envio direto para sua residência com segurança e discrição.",
  },
];

export function QualitySection() {
  return (
    <Section id="qualidade" bg="white">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
          Qualidade e rastreabilidade como padrão
        </h2>
      </FadeUp>

      <FadeUp delay={0.1}>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
          A CBD com Receita atua como plataforma médica estruturada, conectando
          avaliação clínica, condução regulatória e acesso responsável ao
          tratamento com CBD.
        </p>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
        {cards.map(({ icon: Icon, title, description }) => (
          <StaggerItem key={title}>
            <div className="rounded-2xl border border-brand-sand/60 bg-brand-cream/40 p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-forest/8">
                <Icon className="h-6 w-6 text-brand-forest" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-brand-forest-dark">
                {title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-brand-text-secondary">
                {description}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
