"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectableCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  role?: "checkbox" | "radio";
}

export function SelectableCard({
  label,
  selected,
  onClick,
  icon,
  role = "checkbox",
}: SelectableCardProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all duration-300 sm:p-5",
        "hover:-translate-y-0.5 hover:shadow-md",
        selected
          ? "border-brand-forest bg-brand-cream text-brand-forest-dark shadow-sm"
          : "border-brand-sand/60 bg-white text-brand-text hover:border-brand-forest/30"
      )}
    >
      {icon && (
        <span className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
          selected ? "bg-brand-forest/10" : "bg-brand-sand/40"
        )}>
          {icon}
        </span>
      )}
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
          selected
            ? "border-brand-forest bg-brand-forest text-white"
            : "border-brand-sand"
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
