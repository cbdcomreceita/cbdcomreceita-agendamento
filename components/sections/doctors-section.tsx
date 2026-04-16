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
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-brand-sand">
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-forest-light text-2xl font-bold text-brand-cream">
      {initials}
    </div>
  );
}

export function DoctorsSection() {
  return (
    <Section id="medicos" bg="cream">
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
          Nossos médicos prescritores
        </h2>
      </FadeUp>

      <StaggerContainer className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {medicos.map((doc) => (
          <StaggerItem key={doc.id}>
            <div className="group flex flex-col items-center rounded-2xl border border-brand-sand bg-white p-6 text-center transition-all hover:shadow-lg hover:scale-[1.02]">
              <DoctorAvatar
                photoUrl={doc.photoUrl}
                initials={doc.initials}
                name={doc.name}
              />
              <h3 className="mt-4 text-lg font-semibold text-brand-forest-dark">
                {doc.name}
              </h3>
              <p className="mt-1 text-sm text-brand-text-muted">
                {doc.crm
                  ? `CRM ${doc.crm}/${doc.crmUf} — ${doc.specialty}`
                  : `CRM — / — (em breve)`}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {doc.specialties.map((spec) => (
                  <Badge
                    key={spec}
                    variant="secondary"
                    className="bg-brand-sand/60 text-brand-text-secondary text-xs font-normal hover:bg-brand-sand"
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
