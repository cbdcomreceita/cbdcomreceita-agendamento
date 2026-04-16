"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2, CalendarCheck, Video, Clock, User,
  ArrowRight, MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { loadTriageData, clearTriageData } from "@/lib/triagem/storage";
import { loadBookingData, clearBookingData } from "@/lib/calcom/storage";
import { loadPatientData } from "@/lib/validation/patient-storage";
import { medicos, type Medico } from "@/data/medicos";
import { cn } from "@/lib/utils";

export default function ConfirmacaoPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Medico | null>(null);
  const [bookingDateStr, setBookingDateStr] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const triage = loadTriageData();
    const booking = loadBookingData();
    const patient = loadPatientData();

    if (!booking || !patient?.fullName) {
      router.replace("/triagem");
      return;
    }

    const matched = medicos.find((d) => d.id === triage.matchedDoctorId);
    setDoctor(matched ?? null);
    setPatientName(patient.fullName);
    setBookingDateStr(
      format(parseISO(booking.scheduledAt), "EEEE, d 'de' MMMM 'às' HH:mm", {
        locale: ptBR,
      })
    );

    setLoaded(true);
  }, [router]);

  function handleGoHome() {
    clearTriageData();
    clearBookingData();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("patient_data_v1");
    }
  }

  if (!loaded || !doctor) return null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="confirmacao" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4"
      >
        {/* Success header */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-success/10"
          >
            <CheckCircle2 className="h-10 w-10 text-brand-success" />
          </motion.div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
            Consulta agendada com sucesso!
          </h1>
          <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
            Você receberá uma confirmação por e-mail e WhatsApp.
          </p>
        </div>

        {/* Booking details */}
        <div className="mt-8 space-y-4 rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-8">
          <DoctorSummary doctor={doctor} />

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
              <div>
                <p className="font-medium text-brand-text">Data e horário</p>
                <p className="capitalize text-brand-text-secondary">{bookingDateStr}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
              <div>
                <p className="font-medium text-brand-text">Duração</p>
                <p className="text-brand-text-secondary">25 minutos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
              <div>
                <p className="font-medium text-brand-text">Paciente</p>
                <p className="text-brand-text-secondary">{patientName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
              <div>
                <p className="font-medium text-brand-text">Formato</p>
                <p className="text-brand-text-secondary">
                  Videochamada via Google Meet — o link será enviado antes da consulta
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" />
              <div>
                <p className="font-semibold text-brand-success">Pagamento confirmado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important info */}
        <div className="mt-6 rounded-2xl bg-brand-sand/40 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-brand-forest-dark">Informações importantes</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-brand-text-secondary">
            <li>• Você receberá uma confirmação por e-mail e WhatsApp</li>
            <li>• O link do Google Meet será enviado antes da consulta</li>
            <li>• Em caso de atraso superior a 10 minutos, será necessário novo agendamento</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            onClick={handleGoHome}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand-forest text-brand-cream hover:bg-brand-forest-hover font-semibold px-8 py-6"
            )}
          >
            Voltar para o início
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <a
            href="https://wa.me/5584997048210"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-brand-forest/20 text-brand-forest hover:bg-brand-forest/5 px-8 py-6"
            )}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Falar no WhatsApp
          </a>
        </div>
      </motion.div>
    </div>
  );
}
