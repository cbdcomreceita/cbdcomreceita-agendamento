"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const badges = [
  "Avaliação médica individualizada",
  "Prescrição responsável",
  "Condução regulatória estruturada",
  "Entrega domiciliar segura",
];

export function HeroSection() {
  return (
    <section id="hero" className="relative bg-brand-cream px-5 pt-24 sm:px-8 sm:pt-28">
      <div className="mx-auto max-w-7xl py-10 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16 xl:gap-20">
          {/* Text column */}
          <div className="order-2 lg:order-1">
            <FadeUp>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-brand-forest-dark sm:text-5xl lg:text-[56px] xl:text-[64px]">
                Plataforma médica estruturada para tratamento com CBD
              </h1>
            </FadeUp>

            <FadeUp delay={0.15}>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-brand-text-secondary sm:text-lg sm:leading-[1.8] lg:mt-8">
                Da avaliação clínica à entrega domiciliar, estruturamos todo o
                processo com critério médico e conformidade regulatória.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/triagem"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold text-base px-8 py-6 shadow-lg shadow-brand-forest/20 transition-all duration-500"
                  )}
                  data-track="cta_clicked"
                  data-track-section="hero"
                  data-track-label="agendar_avaliacao"
                >
                  Agendar Avaliação com Prescritor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/5584997048210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-brand-forest/20 bg-transparent text-brand-forest hover:bg-brand-forest/5 text-base px-8 py-6 transition-all duration-500"
                  )}
                  data-track="cta_clicked"
                  data-track-section="hero"
                  data-track-label="ja_tenho_prescricao"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Já tenho prescrição
                </a>
              </div>
            </FadeUp>

            {/* Price + trust microcopy */}
            <FadeUp delay={0.4}>
              <div className="mt-6">
                <p className="text-sm font-semibold text-brand-forest">
                  Consulta online por R$&nbsp;49,90
                </p>
                <p className="mt-1.5 text-xs text-brand-text-muted">
                  Pagamento seguro via PIX&ensp;•&ensp;Atendimento online&ensp;•&ensp;Sigilo garantido
                </p>
              </div>
            </FadeUp>

            <StaggerContainer className="mt-8 flex flex-wrap gap-2.5">
              {badges.map((badge) => (
                <StaggerItem key={badge}>
                  <span className="inline-flex items-center rounded-full border border-brand-forest/10 bg-brand-forest/5 px-4 py-2 text-xs font-medium text-brand-forest sm:text-sm">
                    {badge}
                  </span>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Image column */}
          <FadeUp delay={0.1} className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-3xl">
              <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]">
                <Image
                  src="/images/fundo_medico.png"
                  alt="Profissional de saúde em consultório médico estruturado para atendimento com CBD"
                  fill
                  priority
                  fetchPriority="high"
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-forest-dark/30 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-forest-dark/15 via-transparent to-transparent" />
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center pb-6">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-brand-forest-light/40"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </div>
    </section>
  );
}
