"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";

export function CtaSection() {
  return (
    <Section bg="forest">
      <div className="mx-auto max-w-2xl text-center">
        <FadeUp>
          <h2 className="text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl">
            Inicie sua avaliação médica com segurança
          </h2>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="mt-8">
            <Link
              href="/triagem"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-10 py-6"
              )}
              data-track="cta_clicked"
              data-track-section="cta-final"
              data-track-label="agendar_avaliacao"
            >
              Agendar Avaliação com Prescritor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </Section>
  );
}
