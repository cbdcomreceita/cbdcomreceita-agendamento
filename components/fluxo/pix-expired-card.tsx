"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIX_EXPIRED_WHATSAPP = `https://wa.me/5584997048210?text=${encodeURIComponent(
  "Olá! Meu PIX expirou e preciso escolher um novo horário para a consulta."
)}`;

export interface PixExpiredCardProps {
  onChooseNewTime: () => void;
}

/** Approved copy — do not reword without checking with the team. */
export function PixExpiredCard({ onChooseNewTime }: PixExpiredCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4 py-8"
    >
      <AlertTriangle className="h-10 w-10 text-brand-warning" />
      <h2 className="text-lg font-semibold text-brand-forest-dark">
        Este PIX expirou e o horário foi liberado.
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onChooseNewTime}
          className="bg-brand-forest py-6 text-lg text-brand-cream hover:bg-brand-forest-hover"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Escolher novo horário
        </Button>
        <a
          href={PIX_EXPIRED_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "border-brand-forest/20 py-6 text-lg text-brand-forest")}
        >
          Falar no WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
