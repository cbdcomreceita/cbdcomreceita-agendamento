"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Triagem", key: "triagem" },
  { label: "Agenda", key: "agenda" },
  { label: "Dados", key: "dados" },
  { label: "Pagamento", key: "pagamento" },
  { label: "Confirmação", key: "confirmacao" },
];

interface FlowBreadcrumbProps {
  currentStep: string;
}

export function FlowBreadcrumb({ currentStep }: FlowBreadcrumbProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progresso do agendamento" className="mb-8">
      <ol className="flex items-center gap-1 overflow-x-auto text-xs sm:gap-2 sm:text-sm">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <li key={step.key} className="flex shrink-0 items-center gap-1 sm:gap-2">
              {i > 0 && (
                <span
                  className={cn(
                    "h-px w-4 sm:w-6",
                    isCompleted ? "bg-brand-forest" : "bg-brand-sand"
                  )}
                />
              )}
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors",
                  isCompleted && "text-brand-forest",
                  isCurrent && "bg-brand-forest/10 text-brand-forest",
                  !isCompleted && !isCurrent && "text-brand-text-muted"
                )}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
