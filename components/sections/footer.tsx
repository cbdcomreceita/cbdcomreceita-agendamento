import Image from "next/image";
import Link from "next/link";
import { Phone, Mail } from "lucide-react";

const navLinks = [
  { label: "Quem Somos", href: "#quem-somos" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Qualidade", href: "#qualidade" },
  { label: "Dúvidas", href: "#duvidas" },
  { label: "Sou Médico Prescritor", href: "https://wa.me/5584997048210" },
];

const legalLinks = [
  { label: "Termos de Uso", href: "/termos" },
  { label: "Política de Privacidade", href: "/privacidade" },
];

export function Footer() {
  return (
    <footer className="border-t border-brand-sand bg-white px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Image
              src="/images/logo_vertical_transparente.png"
              alt="CBD com Receita"
              width={240}
              height={200}
              className="h-32 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-text-secondary">
              Plataforma médica individualizada para tratamento com CBD.
              Atendimento online em todo o Brasil.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
              Navegação
            </h4>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map(({ label, href }) => (
                <li key={label}>
                  {href.startsWith("http") ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-text-secondary transition-colors hover:text-brand-forest"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="text-sm text-brand-text-secondary transition-colors hover:text-brand-forest"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-brand-text-secondary transition-colors hover:text-brand-forest"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
              Contato
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="https://wa.me/5584997048210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-text-secondary transition-colors hover:text-brand-forest"
                >
                  <Phone className="h-4 w-4" />
                  (84) 99704-8210
                </a>
              </li>
              <li>
                <a
                  href="mailto:cbdcomreceita@gmail.com"
                  className="inline-flex items-center gap-2 text-sm text-brand-text-secondary transition-colors hover:text-brand-forest"
                >
                  <Mail className="h-4 w-4" />
                  cbdcomreceita@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer + Copyright */}
        <div className="mt-14 border-t border-brand-sand pt-8">
          <p className="text-center text-xs leading-relaxed text-brand-text-muted">
            Esta plataforma não substitui atendimento de urgência. Em crises,
            ligue 192 (SAMU) ou 188 (CVV).
          </p>
          <p className="mt-3 text-center text-xs text-brand-text-muted">
            &copy; {new Date().getFullYear()} CBD com Receita. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
