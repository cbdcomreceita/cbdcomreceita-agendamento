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
    <section id="hero" className="relative min-h-[85vh] overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/fundo_medico.png"
        alt="Profissional de saúde em consultório médico estruturado para atendimento com CBD"
        fill
        priority
        fetchPriority="high"
        className="object-cover"
        sizes="100vw"
      />
      {/* Overlay: strong dark top → mid → seamless cream bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-forest-dark/80 via-brand-forest-dark/50 to-brand-forest-dark/30" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-transparent to-[#f2efe8]" />

      {/* Content */}
      <div className="relative flex min-h-[85vh] flex-col justify-center px-5 pt-24 sm:px-8 sm:pt-28">
        <div className="mx-auto w-full max-w-4xl text-center">
          <FadeUp>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[56px] xl:text-[64px]">
              Plataforma médica estruturada para tratamento com CBD
            </h1>
          </FadeUp>

          <FadeUp delay={0.15}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg sm:leading-[1.8] lg:mt-8">
              Da avaliação clínica à entrega domiciliar, estruturamos todo o
              processo com critério médico e conformidade regulatória.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/triagem"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-8 py-6 shadow-lg shadow-black/15 transition-all duration-500"
                )}
                data-track="cta_clicked"
                data-track-section="hero"
                data-track-label="agendar_avaliacao"
              >
                Agendar Avaliação com Prescritor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5584997048210?text=Ol%C3%A1!%20J%C3%A1%20tenho%20prescri%C3%A7%C3%A3o%20m%C3%A9dica%20e%20gostaria%20de%20orienta%C3%A7%C3%A3o%20para%20seguir%20com%20o%20processo%20de%20tratamento%20com%20CBD."
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white text-base px-8 py-6 transition-all duration-500"
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

          <FadeUp delay={0.4}>
            <div className="mt-6">
              <p className="text-sm font-semibold text-white/95">
                Consulta online por R$&nbsp;49,90
              </p>
              <p className="mt-1.5 text-xs text-white/70">
                Pagamento seguro via PIX&ensp;•&ensp;Atendimento online em todo o Brasil&ensp;•&ensp;Sigilo garantido
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-2.5 sm:gap-3">
            {badges.map((badge) => (
              <StaggerItem key={badge}>
                <span className="inline-flex items-center rounded-full border border-[#f2efe8]/50 bg-[#f2efe8]/90 px-4 py-2 text-xs font-medium text-brand-forest-dark backdrop-blur-sm sm:text-sm">
                  {badge}
                </span>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Scroll indicator */}
        <div className="mt-auto flex justify-center pb-8">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-brand-forest-dark/40"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
