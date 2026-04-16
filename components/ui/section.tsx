"use client";

import { cn } from "@/lib/utils";

type SectionBackground = "cream" | "white" | "sand" | "forest";

const bgMap: Record<SectionBackground, string> = {
  cream: "bg-brand-cream",
  white: "bg-white",
  sand: "bg-brand-sand",
  forest: "bg-brand-forest text-brand-text-on-dark",
};

interface SectionProps {
  id?: string;
  bg?: SectionBackground;
  className?: string;
  children: React.ReactNode;
  narrow?: boolean;
}

export function Section({
  id,
  bg = "cream",
  className,
  children,
  narrow,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(bgMap[bg], "px-5 py-20 sm:px-8 sm:py-28 lg:py-32", className)}
    >
      <div
        className={cn(
          "mx-auto",
          narrow ? "max-w-3xl" : "max-w-6xl"
        )}
      >
        {children}
      </div>
    </section>
  );
}
