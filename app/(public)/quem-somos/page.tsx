import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, UserCheck, Scale, FileBox, Eye, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/brand/header";
import { Footer } from "@/components/sections/footer";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Quem Somos",
  description:
    "Conheça a CBD com Receita. Plataforma médica estruturada para acesso responsável ao tratamento com CBD no Brasil.",
};

const pilares = [
  { icon: UserCheck, title: "Avaliação médica individualizada", desc: "Cada paciente é avaliado individualmente por médico prescritor habilitado." },
  { icon: Scale, title: "Conformidade regulatória", desc: "Processos alinhados às normas da Anvisa e órgãos reguladores." },
  { icon: FileBox, title: "Processo estruturado de importação", desc: "Suporte completo na organização regulatória via plataforma da Anvisa." },
  { icon: Eye, title: "Transparência sobre fornecedores", desc: "Fornecedores internacionais que seguem critérios técnicos e regulatórios." },
];

export default function QuemSomosPage() {
  return (
    <>
      <Header />
      <main id="conteudo-principal">
        {/* Hero */}
        <section className="bg-brand-forest px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-cream sm:text-4xl lg:text-5xl">
              Plataforma médica estruturada para acesso responsável ao tratamento com CBD no Brasil
            </h1>
            <div className="mt-8">
              <Link
                href="/triagem"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-8 py-6 shadow-lg transition-all duration-500"
                )}
              >
                Agendar Avaliação Médica
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Nosso papel */}
        <Section bg="cream">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-forest/8">
              <ShieldCheck className="h-8 w-8 text-brand-forest" />
            </div>
            <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
              Nosso papel
            </h2>
            <div className="mt-8 space-y-5 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
              <p>
                Não atuamos como e-commerce de medicamentos nem como intermediários
                comerciais. Organizamos o acesso ao tratamento de forma estruturada,
                conectando paciente, médico prescritor e fornecedor internacional
                autorizado quando houver indicação clínica.
              </p>
              <p>
                A aquisição ocorre diretamente entre paciente e fornecedor. A CBD com
                Receita não comercializa medicamentos.
              </p>
            </div>
          </div>
        </Section>

        {/* Compromisso */}
        <Section bg="white">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
              Compromisso com responsabilidade e conformidade
            </h2>
            <p className="mt-6 text-base leading-[1.8] text-brand-text-secondary sm:text-lg">
              Atuamos em conformidade com regulamentações aplicáveis, acompanhando
              diretrizes regulatórias para garantir segurança e transparência.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            {pilares.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-brand-sand/60 bg-brand-cream/40 p-7 shadow-sm">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-forest/8">
                  <Icon className="h-6 w-6 text-brand-forest" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-brand-forest-dark">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-brand-forest via-brand-forest to-brand-forest-dark px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl">
              Inicie sua avaliação médica com segurança
            </h2>
            <div className="mt-8">
              <Link
                href="/triagem"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand-cream text-brand-forest-dark hover:bg-white font-semibold text-base px-10 py-6 shadow-lg transition-all duration-500"
                )}
              >
                Começar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
