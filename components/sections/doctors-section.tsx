"use client";

import Image from "next/image";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { medicos } from "@/data/medicos";

function DoctorAvatar({
  photoUrl,
  initials,
  name,
}: {
  photoUrl: string | null;
  initials: string;
  name: string;
}) {
  if (photoUrl) {
    return (
      <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-brand-cream shadow-lg">
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          fill
          className="object-cover object-top"
          sizes="144px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-36 w-36 items-center justify-center rounded-full bg-brand-forest-light text-3xl font-bold text-brand-cream shadow-lg">
      {initials}
    </div>
  );
}

export function DoctorsSection() {
  return (
    <Section id="medicos" bg="cream">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
          Nossos médicos prescritores
        </h2>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {medicos.filter((d) => d.isActive).map((doc) => (
          <StaggerItem key={doc.id}>
            <div className="group flex flex-col items-center rounded-2xl border border-brand-sand/80 bg-white p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg">
              <DoctorAvatar
                photoUrl={doc.photoUrl}
                initials={doc.initials}
                name={doc.name}
              />
              <h3 className="mt-5 text-lg font-semibold text-brand-forest-dark">
                {doc.name}
              </h3>
              <p className="mt-1.5 text-sm text-brand-text-muted">
                {doc.crm
                  ? `CRM ${doc.crm}/${doc.crmUf} — ${doc.specialty}`
                  : `CRM — / — (em breve)`}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {doc.specialties.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="bg-brand-sand/50 text-brand-text-secondary text-xs font-normal hover:bg-brand-sand transition-colors duration-300"
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </Section>
  );
}
