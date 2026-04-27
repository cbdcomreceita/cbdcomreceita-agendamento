"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock, Copy, CheckCircle2, Loader2, RefreshCw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { loadTriageData } from "@/lib/triagem/storage";
import { loadBookingData, saveBookingData } from "@/lib/calcom/storage";
import { loadPatientData } from "@/lib/validation/patient-storage";
import {
  createPixPayment,
  checkPaymentStatus,
  type PixPaymentResult,
} from "@/lib/mercadopago/actions";
import { simulatePaymentApproved } from "@/lib/mercadopago/simulate";
import { trackEvent } from "@/lib/analytics/track";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { medicos, type Medico } from "@/data/medicos";
import { cn } from "@/lib/utils";

type PaymentState = "loading" | "awaiting" | "approved" | "expired" | "error";

const POLL_INTERVAL = 5000;
const EXPIRY_MINUTES = 15;

export default function PagamentoPage() {
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("loading");
  const [doctor, setDoctor] = useState<Medico | null>(null);
  const [bookingDateStr, setBookingDateStr] = useState("");
  const [patientName, setPatientName] = useState("");
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [countdown, setCountdown] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Init: load data and create payment
  useEffect(() => {
    const triage = loadTriageData();
    const booking = loadBookingData();
    const patient = loadPatientData();

    if (!triage.selectedSymptoms?.length || !booking || !patient?.fullName) {
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

    // Create payment
    createPixPayment(patient as Parameters<typeof createPixPayment>[0], booking)
      .then((result) => {
        setPixData(result);
        setState("awaiting");
        trackEvent(ANALYTICS_EVENTS.PAYMENT_INITIATED);
      })
      .catch(() => {
        setState("error");
      });
  }, [router]);

  // Polling for payment status
  useEffect(() => {
    if (state !== "awaiting" || !pixData) return;

    pollRef.current = setInterval(async () => {
      const result = await checkPaymentStatus(pixData.mpPaymentId);
      if (result.status === "approved") {
        setState("approved");
        trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED);
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => router.push("/confirmacao"), 2000);
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state, pixData, router]);

  // Countdown timer
  useEffect(() => {
    if (state !== "awaiting" || !pixData) return;

    const expiresAt = new Date(pixData.expiresAt).getTime();

    countdownRef.current = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setState("expired");
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        setCountdown("00:00");
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state, pixData]);

  const copyCode = useCallback(async () => {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    toast.success("Código PIX copiado!");
  }, [pixData]);

  async function handleSimulatePayment() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const triage = loadTriageData();
    const booking = loadBookingData();
    const patient = loadPatientData();

    if (booking && patient?.fullName) {
      const result = await simulatePaymentApproved({
        patient: patient as Parameters<typeof simulatePaymentApproved>[0]["patient"],
        booking,
        triage,
      });
      if (!result.success) {
        console.error("[Simulate] Failed:", result.error);
        toast.error(result.error ?? "Erro ao processar pagamento");
        setState("error");
        return;
      }
      if (result.meetLink) {
        saveBookingData({ ...booking, meetLink: result.meetLink });
      }
    }

    setState("approved");
    trackEvent(ANALYTICS_EVENTS.PAYMENT_COMPLETED);
    setTimeout(() => router.push("/confirmacao"), 2000);
  }

  async function handleRegeneratePix() {
    setState("loading");
    const booking = loadBookingData();
    const patient = loadPatientData();
    if (!booking || !patient?.fullName) return;

    try {
      const result = await createPixPayment(
        patient as Parameters<typeof createPixPayment>[0],
        booking
      );
      setPixData(result);
      setState("awaiting");
    } catch {
      setState("error");
    }
  }

  if (!doctor) return null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <FlowBreadcrumb currentStep="pagamento" />

      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Pagamento
      </h1>

      {/* Summary card */}
      <div className="mt-4 space-y-3">
        <DoctorSummary doctor={doctor} />
        <div className="rounded-xl border border-brand-sand/60 bg-white p-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-text-muted">Data</span>
              <span className="capitalize text-brand-text">{bookingDateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-text-muted">Duração</span>
              <span className="text-brand-text">25 minutos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-text-muted">Paciente</span>
              <span className="text-brand-text">{patientName}</span>
            </div>
            <div className="h-px bg-brand-sand/40" />
            <div className="flex justify-between text-base font-semibold">
              <span className="text-brand-forest-dark">Total</span>
              <span className="text-brand-forest">R$&nbsp;49,90</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment section */}
      <div className="mt-8 rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
              <p className="text-sm text-brand-text-muted">Gerando PIX...</p>
            </motion.div>
          )}

          {/* Awaiting payment */}
          {state === "awaiting" && pixData && (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-track="payment_initiated"
            >
              <h2 className="text-center text-lg font-semibold text-brand-forest-dark">
                Pagamento via PIX
              </h2>
              <p className="mt-1 text-center text-sm text-brand-text-secondary">
                Abra o app do seu banco, selecione pagamento via PIX e escaneie o QR Code ou copie o código abaixo
              </p>

              {/* QR Code */}
              <div className="mx-auto mt-6 flex items-center justify-center">
                {pixData.qrCodeBase64 ? (
                  <div className="rounded-2xl border border-brand-sand/60 bg-white p-4">
                    <Image
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      width={256}
                      height={256}
                      className="h-52 w-52 sm:h-64 sm:w-64"
                    />
                  </div>
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-brand-sand bg-brand-cream/50 sm:h-64 sm:w-64">
                    <p className="text-center text-xs text-brand-text-muted">
                      QR Code indisponível.<br />Use o código abaixo.
                    </p>
                  </div>
                )}
              </div>

              {/* Copy code */}
              <div className="mt-6">
                <div className="flex items-center gap-2 rounded-xl border border-brand-sand/60 bg-brand-cream/30 p-3">
                  <code className="flex-1 truncate text-xs text-brand-text-secondary">
                    {pixData.qrCode}
                  </code>
                  <Button
                    onClick={copyCode}
                    variant="outline"
                    className="shrink-0 border-brand-forest/20 text-brand-forest"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Countdown */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Clock className={cn(
                  "h-4 w-4 animate-pulse",
                  countdown && parseInt(countdown) < 2 ? "text-brand-error" : "text-brand-forest-light"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  countdown && parseInt(countdown) < 2 ? "text-brand-error" : "text-brand-text-muted"
                )}>
                  Este pagamento expira em {countdown}
                </span>
              </div>

              {/* Waiting indicator */}
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-brand-cream/50 p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-brand-warning" />
                <span className="text-sm text-brand-text-secondary">
                  Aguardando pagamento...
                </span>
              </div>

              {/* Temporary: simulate button (remove after launch) */}
              <div className="mt-4 rounded-xl border border-dashed border-brand-text-muted/30 p-3 text-center">
                <p className="text-[11px] uppercase tracking-wider text-brand-text-muted">
                  Modo teste
                </p>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="mt-1 text-xs font-medium text-brand-text-muted underline underline-offset-2 transition-colors hover:text-brand-text-secondary"
                >
                  Simular pagamento
                </button>
              </div>
            </motion.div>
          )}

          {/* Approved */}
          {state === "approved" && (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12"
              data-track="payment_completed"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-success/10"
              >
                <CheckCircle2 className="h-8 w-8 text-brand-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-brand-forest-dark">
                Pagamento confirmado!
              </h2>
              <p className="text-sm text-brand-text-secondary">
                Redirecionando para a confirmação...
              </p>
            </motion.div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <motion.div
              key="expired"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <AlertTriangle className="h-10 w-10 text-brand-warning" />
              <h2 className="text-lg font-semibold text-brand-forest-dark">
                Código PIX expirado
              </h2>
              <p className="text-sm text-brand-text-secondary">
                O tempo para pagamento se esgotou.
              </p>
              <Button
                onClick={handleRegeneratePix}
                className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar novo código PIX
              </Button>
            </motion.div>
          )}

          {/* Error */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <AlertTriangle className="h-10 w-10 text-brand-error" />
              <h2 className="text-lg font-semibold text-brand-forest-dark">
                Erro ao gerar pagamento
              </h2>
              <p className="text-center text-sm text-brand-text-secondary">
                Tente novamente ou entre em contato pelo WhatsApp.
              </p>
              <Button
                onClick={handleRegeneratePix}
                className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
