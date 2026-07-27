"use client";

import { ArrowLeft } from "lucide-react";

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text-secondary transition-colors hover:text-brand-forest"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}
