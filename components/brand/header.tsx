"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Qualidade", href: "#qualidade" },
  { label: "Dúvidas", href: "#duvidas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-brand-cream/90 shadow-sm backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold text-brand-forest-dark transition-colors"
        >
          CBD com Receita
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              className="text-sm font-medium text-brand-text-secondary transition-colors duration-300 hover:text-brand-forest"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/triagem"
          className={cn(
            buttonVariants({ size: "sm" }),
            "hidden bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold shadow-sm transition-all duration-500 md:inline-flex"
          )}
        >
          Agendar Avaliação
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-forest-dark transition-colors hover:bg-brand-forest/5 md:hidden"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-brand-sand/50 bg-brand-cream/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-5 py-4" aria-label="Menu mobile">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-forest/5 hover:text-brand-forest"
              >
                {label}
              </a>
            ))}
            <div className="pt-2">
              <Link
                href="/triagem"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold"
                )}
              >
                Agendar Avaliação
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
