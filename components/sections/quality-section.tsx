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
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
          Qualidade e rastreabilidade como padrão
        </h2>
      </FadeUp>

      <FadeUp delay={0.1}>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-brand-text-secondary sm:text-lg">
          A CBD com Receita atua como plataforma médica estruturada, conectando
          avaliação clínica, condução regulatória e acesso responsável ao
          tratamento com CBD.
        </p>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {cards.map(({ icon: Icon, title, description }) => (
          <StaggerItem key={title}>
            <div className="group rounded-xl border border-brand-sand bg-brand-cream/50 p-6 transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-forest/10">
                <Icon className="h-6 w-6 text-brand-forest" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-brand-forest-dark">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">
                {description}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
