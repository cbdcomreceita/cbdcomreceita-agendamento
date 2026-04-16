"use client";

import Image from "next/image";
import { UserCheck, Scale, FileBox, Eye } from "lucide-react";
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
    <section id="quem-somos" className="relative overflow-hidden bg-brand-forest px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      {/* Background image — subtle plant / consultation room */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <Image
          src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=80"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2 className="text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl">
              Nosso papel
            </h2>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="mt-6 text-base leading-relaxed text-brand-cream/85 sm:text-lg">
              Não atuamos como e-commerce de medicamentos nem como intermediários
              comerciais. Organizamos o acesso ao tratamento de forma estruturada,
              conectando paciente, médico prescritor e fornecedor internacional
              autorizado quando houver indicação clínica.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="mt-4 text-base leading-relaxed text-brand-cream/85 sm:text-lg">
              A aquisição ocorre diretamente entre paciente e fornecedor. A CBD com
              Receita não comercializa medicamentos.
            </p>
          </FadeUp>
        </div>

        <StaggerContainer className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {pilares.map(({ icon: Icon, label }) => (
            <StaggerItem key={label}>
              <div className="flex items-center gap-4 rounded-xl border border-brand-cream/15 bg-brand-cream/5 p-4 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-cream/10">
                  <Icon className="h-5 w-5 text-brand-cream" />
                </div>
                <span className="text-sm font-medium text-brand-cream sm:text-base">
                  {label}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
