"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepNavProps {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export function StepNav({
  onNext,
  onBack,
  nextLabel = "Continuar",
  nextDisabled = false,
}: StepNavProps) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-8 flex items-center gap-3 border-t border-brand-sand/40 bg-brand-cream/95 px-5 pb-6 pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-brand-text-secondary hover:text-brand-forest"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          buttonVariants({ size: "lg" }),
          "ml-auto bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold px-8 py-5 shadow-sm transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {nextLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </div>
  );
}
