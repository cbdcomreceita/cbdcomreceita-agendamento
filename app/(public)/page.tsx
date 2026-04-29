import type { Metadata } from "next";
import { Header } from "@/components/brand/header";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { CookieBanner } from "@/components/brand/cookie-banner";
import { HeroSection } from "@/components/sections/hero-section";
import { CredibilitySection } from "@/components/sections/credibility-section";
import { ConditionsSection } from "@/components/sections/conditions-section";
import { TreatmentSection } from "@/components/sections/treatment-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { QualitySection } from "@/components/sections/quality-section";
import { AboutSection } from "@/components/sections/about-section";
import { FaqSection, FaqJsonLd } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: {
    absolute: "CBD com Receita — Plataforma médica estruturada para tratamento com CBD",
  },
  description:
    "Plataforma médica para tratamento com CBD. Avaliação clínica, conformidade regulatória e entrega domiciliar. Consulta online R$49,90.",
  openGraph: {
    title: "CBD com Receita — Plataforma médica para tratamento com CBD",
    description:
      "Conectamos você a médicos especializados em tratamentos com CBD. Consulta online com segurança e responsabilidade.",
    type: "website",
    locale: "pt_BR",
    url: "/",
  },
};

function MedicalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          name: "CBD com Receita",
          description:
            "Plataforma médica estruturada para acesso seguro a tratamentos com CBD. Avaliação clínica individualizada, conformidade regulatória e entrega domiciliar.",
          url: "https://www.cbdcomreceita.com.br",
          telephone: "+5584997048210",
          email: "cbdcomreceita@gmail.com",
          address: {
            "@type": "PostalAddress",
            addressCountry: "BR",
          },
          medicalSpecialty: "Psychiatric",
          availableService: {
            "@type": "MedicalTherapy",
            name: "Avaliação médica para tratamento com CBD",
            description:
              "Consulta online individualizada com médico prescritor para avaliação de tratamento com canabidiol.",
          },
          priceRange: "R$49,90",
        }),
      }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <MedicalBusinessJsonLd />
      <FaqJsonLd />
      <Header />
      <main id="conteudo-principal">
        <HeroSection />
        <CredibilitySection />
        <ConditionsSection />
        <TreatmentSection />
        <HowItWorksSection />
        <QualitySection />
        <AboutSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
