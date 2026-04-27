"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, User } from "lucide-react";
import { motion } from "framer-motion";
import { loadTriageData } from "@/lib/triagem/storage";
import { matchDoctor, type MatchResult } from "@/lib/triagem/matcher";
import { trackEvent } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function DoctorAvatar({ photoUrl, initials, name }: { photoUrl: string | null; initials: string; name: string }) {
  if (photoUrl) {
    return (
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-brand-cream shadow-lg sm:h-40 sm:w-40">
        <Image src={photoUrl} alt={`Foto de ${name}`} fill className="object-cover object-top" sizes="160px" />
      </div>
    );
  }
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-forest-light text-3xl font-bold text-brand-cream shadow-lg sm:h-40 sm:w-40">
      {initials}
    </div>
  );
}

export default function ResultadoPage() {
  const router = useRouter();
  const [result, setResult] = useState<MatchResult | null>(null);
  const [ageNote, setAgeNote] = useState<string | null>(null);

  useEffect(() => {
    const data = loadTriageData();
    if (!data.selectedSymptoms?.length) {
      router.replace("/triagem");
      return;
    }
    const match = matchDoctor(data.selectedSymptoms, {
      isMinor: data.isMinor,
      isElderly: data.isElderly,
    });
    setResult(match);
    trackEvent(ANALYTICS_EVENTS.DOCTOR_MATCHED, { doctor: match.doctor.name });
    if (data.isMinor) {
      setAgeNote(`Direcionamos você para o ${match.doctor.name}, médico que atende crianças e adolescentes.`);
    } else if (data.isElderly) {
      setAgeNote(`Direcionamos você para o ${match.doctor.name}, médico que atende pacientes acima de 65 anos.`);
    }
  }, [router]);

  if (!result) return null;

  const { doctor, matchedSymptoms, alternativeDoctor } = result;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <p className="text-center text-sm font-medium text-brand-text-muted">
          Você foi direcionado(a) para
        </p>

        <div
          className="mt-6 flex flex-col items-center rounded-3xl border border-brand-sand/80 bg-white p-8 text-center shadow-sm sm:p-10"
          data-track="doctor_matched"
          data-track-doctor={doctor.name}
        >
          <DoctorAvatar photoUrl={doctor.photoUrl} initials={doctor.initials} name={doctor.name} />

          <h1 className="mt-5 text-2xl font-bold text-brand-forest-dark">
            {doctor.name}
          </h1>

          {doctor.crm && (
            <p className="mt-1 text-sm text-brand-text-muted">
              CRM {doctor.crm}/{doctor.crmUf} — {doctor.specialty}
            </p>
          )}

          <p className="mt-3 text-sm text-brand-text-secondary">
            {ageNote || "Especialista nas condições que você indicou"}
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {matchedSymptoms
              .filter((s) => !s.isEmergency)
              .map((s) => (
                <Badge
                  key={s.slug}
                  variant="secondary"
                  className="bg-brand-forest/8 text-brand-forest text-xs font-medium"
                >
                  {s.label}
                </Badge>
              ))}
          </div>

          <Link
            href="/agenda"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 w-full bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold text-base py-6 shadow-lg shadow-brand-forest/20 transition-all duration-500"
            )}
            data-track="cta_clicked"
            data-track-section="resultado"
            data-track-label="ver_agenda"
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            Ver agenda disponível
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {alternativeDoctor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <button
              type="button"
              onClick={() => {
                // Swap to alternative — save and re-render
                const data = loadTriageData();
                const alt = matchDoctor(data.selectedSymptoms ?? []);
                if (alt.alternativeDoctor) {
                  setResult({
                    doctor: alternativeDoctor,
                    matchedSymptoms: alt.matchedSymptoms,
                    alternativeDoctor: alt.doctor,
                  });
                }
              }}
              className="inline-flex items-center gap-2 text-sm text-brand-text-muted transition-colors hover:text-brand-forest"
            >
              <User className="h-4 w-4" />
              Ver outro médico disponível
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
