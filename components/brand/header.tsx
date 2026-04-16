"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Qualidade", href: "#qualidade" },
  { label: "Dúvidas", href: "#duvidas" },
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Sou Médico Prescritor", href: "https://wa.me/5584997048210?text=Ol%C3%A1!%20Sou%20m%C3%A9dico(a)%20prescritor(a)%20e%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20parceria%20com%20a%20CBD%20com%20Receita.", external: true },
] as const;

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
      <div className={cn(
            "mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-500 sm:px-8",
            scrolled ? "py-2 sm:py-2" : "py-3 sm:py-4"
          )}>
        {/* Logo */}
        <Link href="/" className="relative shrink-0">
          <Image
            src="/images/logo_horizontal_transparente.png"
            alt="CBD com Receita"
            width={400}
            height={160}
            className={cn(
              "w-auto transition-all duration-500",
              scrolled ? "h-14 sm:h-20" : "h-20 sm:h-36 brightness-0 invert"
            )}
            priority
          />
        </Link>

        {/* Desktop nav + CTA — right aligned */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6" aria-label="Navegação principal">
            {navLinks.map((link) => {
              const isExternal = "external" in link && link.external;
              const isHash = link.href.startsWith("#");
              const linkClass = cn(
                "relative text-sm font-medium transition-colors duration-300 whitespace-nowrap after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full",
                scrolled
                  ? "text-brand-text-secondary hover:text-brand-forest"
                  : "text-white/80 hover:text-white"
              );

              if (isExternal) {
                return (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {link.label}
                  </a>
                );
              }
              if (isHash) {
                return (
                  <a key={link.href} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className={linkClass}>
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Link
          href="/triagem"
          className={cn(
            buttonVariants({ size: "sm" }),
            "font-semibold shadow-sm transition-all duration-500",
            scrolled
              ? "bg-brand-forest text-brand-cream hover:bg-brand-forest-hover"
              : "bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 border border-white/20"
          )}
        >
          Agendar Avaliação
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors md:hidden",
            scrolled
              ? "text-brand-forest-dark hover:bg-brand-forest/5"
              : "text-white hover:bg-white/10"
          )}
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
            {navLinks.map((link) => {
              const isExternal = "external" in link && link.external;
              const isHash = link.href.startsWith("#");
              const cls = "block rounded-xl px-4 py-3 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-forest/5 hover:text-brand-forest";

              if (isExternal) {
                return (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className={cls}>
                    {link.label}
                  </a>
                );
              }
              if (isHash) {
                return (
                  <a key={link.href} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className={cls}>
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={cls}>
                  {link.label}
                </Link>
              );
            })}
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
