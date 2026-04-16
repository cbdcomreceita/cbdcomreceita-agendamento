"use client";

import Link from "next/link";
import { UserCheck, Scale, FileBox, Eye, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const pilares = [
  { icon: UserCheck, label: "Avaliação individualizada" },
  { icon: Scale, label: "Conformidade regulatória" },
  { icon: FileBox, label: "Processo estruturado de importação" },
  { icon: Eye, label: "Transparência sobre fornecedores" },
];

export function AboutSection() {
  return (
    <Section id="quem-somos" bg="forest" className="relative overflow-hidden">
      {/* Decorative element — organic shape */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-forest-light/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-brand-cream/5 blur-3xl" />

      <div className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <FadeUp>
            {/* Decorative line */}
            <div className="mx-auto mb-8 h-px w-12 bg-brand-cream/30" />
            <h2 className="text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl lg:text-4xl">
              Nosso papel
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="mt-8 text-base leading-[1.8] text-brand-cream/80 sm:text-lg">
              Não atuamos como e-commerce de medicamentos nem como intermediários
              comerciais. Organizamos o acesso ao tratamento de forma estruturada,
              conectando paciente, médico prescritor e fornecedor internacional
              autorizado quando houver indicação clínica.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="mt-5 text-base leading-[1.8] text-brand-cream/80 sm:text-lg">
              A aquisição ocorre diretamente entre paciente e fornecedor. A CBD com
              Receita não comercializa medicamentos.
            </p>
          </FadeUp>
        </div>

        <StaggerContainer className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-2">
          {pilares.map(({ icon: Icon, label }) => (
            <StaggerItem key={label}>
              <div className="flex items-center gap-4 rounded-2xl border border-brand-cream/10 bg-brand-cream/5 p-5 backdrop-blur-sm transition-all duration-500 hover:bg-brand-cream/8">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cream/10">
                  <Icon className="h-5 w-5 text-brand-cream/90" />
                </div>
                <span className="text-sm font-medium text-brand-cream/90 sm:text-base">
                  {label}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeUp delay={0.4}>
          <div className="mt-12 text-center">
            <Link
              href="/quem-somos"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-brand-cream/30 bg-transparent text-brand-cream hover:bg-brand-cream/10 hover:text-brand-cream font-semibold px-8 py-6 transition-all duration-500"
              )}
            >
              Conheça a CBD com Receita
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </Section>
  );
}
