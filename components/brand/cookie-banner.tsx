"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "cbd_lgpd_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-sand bg-white/95 px-5 py-4 shadow-lg backdrop-blur-md sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-brand-text-secondary">
          Utilizamos cookies para melhorar sua experiência. Ao continuar
          navegando, você concorda com nossa{" "}
          <Link
            href="/privacidade"
            className="font-medium text-brand-forest underline underline-offset-2 hover:text-brand-forest-dark"
          >
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/privacidade"
            className="text-sm font-medium text-brand-text-secondary transition-colors hover:text-brand-forest"
          >
            Saiba mais
          </Link>
          <Button
            onClick={accept}
            className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold shadow-sm"
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
