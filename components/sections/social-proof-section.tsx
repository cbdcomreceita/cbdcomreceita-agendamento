"use client";

import { useRef } from "react";
import { useInView, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Users, HeartPulse, Globe } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] });
    }
  }, [isInView, count, value]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = `+${v}${suffix}`;
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return (
    <motion.span
      ref={ref}
      className="text-4xl font-bold tracking-tight text-brand-forest-dark sm:text-5xl"
    >
      +0{suffix}
    </motion.span>
  );
}

const stats = [
  {
    value: 500,
    suffix: "",
    label: "Pacientes atendidos",
    icon: Users,
  },
  {
    value: 50,
    suffix: "",
    label: "Tratamentos em andamento",
    icon: HeartPulse,
  },
  {
    value: 27,
    suffix: "",
    label: "Estados com atendimento",
    icon: Globe,
  },
];

export function SocialProofSection() {
  return (
    <Section id="confianca" bg="cream">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
          Números que refletem confiança
        </h2>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-3">
        {stats.map(({ value, suffix, label, icon: Icon }) => (
          <StaggerItem key={label}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-forest/8">
                <Icon className="h-6 w-6 text-brand-forest" />
              </div>
              <AnimatedNumber value={value} suffix={suffix} />
              <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
                {label}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
