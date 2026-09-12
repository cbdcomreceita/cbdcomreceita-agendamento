"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDateLong } from "@/lib/utils/datetime";
import { formatCentsToBRL } from "@/lib/utils/currency";
import {
  Clock, Copy, CheckCircle2, Loader2, RefreshCw, AlertTriangle, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FlowBreadcrumb } from "@/components/fluxo/flow-breadcrumb";
import { DoctorSummary } from "@/components/fluxo/doctor-summary";
import { loadTriageData } from "@/lib/triagem/storage";
import { loadBookingData, saveBookingData } from "@/lib/calcom/storage";
import { loadPatientData } from "@/lib/validation/patient-storage";
import { checkPaymentStatus } from "@/lib/mercadopago/actions";
import { createBooking } from "@/app/actions/create-booking";
import { generatePix, type GeneratePixResult } from "@/app/actions/generate-pix";
import { confirmBooking } from "@/app/actions/confirm-booking";
import { trackEvent } from "@/lib/analytics/track";
import { getDoctorById } from "@/app/actions/get-doctors";
import type { Doctor } from "@/lib/types/doctor";
import { cn } from "@/lib/utils";

type PaymentState =
  | "loading"
  | "awaiting"
  | "confirming"
  | "confirmed"
  | "confirmed_pending_email"
  | "verifying_expiry"
  | "expired"
  | "expired_unverified"
  | "error";

interface PixData {
  paymentId: string;
  mpPaymentId: number | null;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  isMock: boolean;
  amountCents: number;
  couponApplied: string | null;
}

const POLL_INTERVAL = 5000;
// Time we let confirmBooking run (MP re-check, Cal.com, e-mails, WhatsApp,
// Meta) before giving up on showing the full confirmation inline and
// falling back to "check your e-mail". Measured in production: a normal
// run takes single-digit seconds; a slow one (observed) took ~37s.
const CONFIRM_TIMEOUT_MS = 45000;
const BASE_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_CONSULTATION_PRICE ?? "4990");

export default function PagamentoPage() {
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("loading");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [bookingDateStr, setBookingDateStr] = useState("");
  const [patientName, setPatientName] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [countdown, setCountdown] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const fbCookiesRef = useRef<{ fbc?: string; fbp?: string }>({});
  // Guards handlePaymentApproved against running twice — it can be
  // triggered either by the regular poll tick or by the last-chance check
  // at PIX expiry, and must only ever call confirmBooking once.
  const approvalHandledRef = useRef(false);

  useEffect(() => {
    const cookieMap = document.cookie.split(";").reduce<Record<string, string>>((acc, c) => {
      const [k, v] = c.trim().split("=");
      if (k) acc[k] = v ?? "";
      return acc;
    }, {});
    fbCookiesRef.current = {
      fbc: cookieMap["_fbc"] || undefined,
      fbp: cookieMap["_fbp"] || undefined,
    };
  }, []);

  const handlePixResult = useCallback(
    (id: string, result: GeneratePixResult) => {
      if (
        !result.success ||
        !result.qrCode ||
        !result.expiresAt ||
        result.amountCents === undefined
      ) {
        console.error("[Pagamento] generatePix failed:", result.error);
        if (result.error === "rate_limit_exceeded") {
          const minutes = Math.max(1, Math.ceil((result.retryAfter ?? 600) / 60));
          toast.error(
            `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes > 1 ? "s" : ""}.`
          );
        } else {
          toast.error(result.error ?? "Erro ao gerar pagamento");
        }
        setState("error");
        return;
      }

      // A coupon that failed validation never blocks checkout — the PIX
      // above was already generated at full price. Just surface why.
      if (result.couponError) toast.error(result.couponError);

      setPixData({
        paymentId: result.paymentId!,
        mpPaymentId: result.mpPaymentId ?? null,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64 ?? "",
        expiresAt: result.expiresAt,
        isMock: result.isMock ?? false,
        amountCents: result.amountCents,
        couponApplied: result.couponApplied ?? null,
      });
      setState("awaiting");
      trackEvent({
        name: "pix_generated",
        value: result.amountCents / 100,
        booking_id: id,
        coupon: result.couponApplied ?? undefined,
      });
    },
    []
  );

  const runGeneratePix = useCallback(
    (id: string, couponCode?: string) => {
      setState("loading");
      generatePix({ bookingId: id, couponCode })
        .then((result) => handlePixResult(id, result))
        .catch((err) => {
          console.error("[Pagamento] generatePix threw:", err);
          toast.error("Erro ao gerar pagamento");
          setState("error");
        });
    },
    [handlePixResult]
  );

  // Init: persist patient + booking in Supabase (status='awaiting_payment'),
  // then immediately generate the PIX — the coupon (if any) was already
  // typed back on /dados and travels here via triage state, so there's no
  // separate coupon step on this page anymore.
  const initBooking = useCallback(() => {
    const triage = loadTriageData();
    const booking = loadBookingData();
    const patient = loadPatientData();

    if (!triage.selectedSymptoms?.length || !booking || !patient?.fullName) {
      router.replace("/triagem");
      return;
    }

    if (triage.matchedDoctorId) {
      getDoctorById(triage.matchedDoctorId).then((matched) => setDoctor(matched));
    }
    setPatientName(patient.fullName);
    setBookingDateStr(formatDateLong(booking.scheduledAt));

    setState("loading");

    createBooking({
      patient: patient as Parameters<typeof createBooking>[0]["patient"],
      booking,
      triage,
    })
      .then((result) => {
        if (!result.success || !result.bookingId) {
          console.error("[Pagamento] createBooking failed:", result.error);
          if (result.error === "invalid_doctor_session") {
            toast.error("Sua sessão expirou. Escolha o horário novamente.");
            router.replace("/agenda");
            return;
          }
          if (result.error === "rate_limit_exceeded") {
            const minutes = Math.max(1, Math.ceil((result.retryAfter ?? 600) / 60));
            toast.error(
              `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes > 1 ? "s" : ""}.`
            );
          } else {
            toast.error(result.error ?? "Erro ao criar agendamento");
          }
          setState("error");
          return;
        }

        setBookingId(result.bookingId);
        // Persist bookingId so /confirmacao (and a future page refresh)
        // can fetch the booking from the DB if needed.
        saveBookingData({ ...booking, bookingId: result.bookingId });
        runGeneratePix(result.bookingId, triage.couponCode);
      })
      .catch((err) => {
        console.error("[Pagamento] createBooking threw:", err);
        toast.error("Erro ao criar agendamento");
        setState("error");
      });
  }, [router, runGeneratePix]);

  useEffect(() => {
    initBooking();
  }, [initBooking]);

  // Called the moment MP reports "approved" — either from the regular poll
  // tick or from the last-chance check when the PIX countdown runs out.
  // Moves the UI off the QR code immediately (state "confirming") and only
  // then calls confirmBooking (server action) ourselves rather than waiting
  // on the MP webhook — the webhook stays as a backup, idempotency prevents
  // duplicate processing.
  //
  // confirmBooking does a long chain of sequential third-party calls (MP
  // re-check, Cal.com, patient/doctor/team e-mails, WhatsApp, Meta) before
  // it resolves, so we race it against CONFIRM_TIMEOUT_MS. Whichever
  // happens first decides the screen; if confirmBooking is still slow or
  // fails after we've already shown "confirmed_pending_email", we no longer
  // touch the screen — we just persist the meet link / fire analytics
  // silently so the data isn't lost.
  const handlePaymentApproved = useCallback(() => {
    if (approvalHandledRef.current || !bookingId || !pixData) return;
    approvalHandledRef.current = true;

    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setState("confirming");

    let finalized = false;

    const fallbackTimer = setTimeout(() => {
      if (finalized) return;
      finalized = true;
      setState("confirmed_pending_email");
    }, CONFIRM_TIMEOUT_MS);

    console.log("[Pagamento] Payment approved. Calling confirmBooking", { bookingId });

    confirmBooking({
      bookingId,
      source: "polling",
      userFbc: fbCookiesRef.current.fbc,
      userFbp: fbCookiesRef.current.fbp,
    })
      .then((confirm) => {
        console.log("[Pagamento] confirmBooking result:", JSON.stringify(confirm));

        const currentBooking = loadBookingData();
        if (currentBooking && confirm.meetLink) {
          saveBookingData({ ...currentBooking, meetLink: confirm.meetLink });
        }

        if (!confirm.success) {
          console.error("[Pagamento] confirmBooking returned failure:", confirm.error);
          if (finalized) return;
          finalized = true;
          clearTimeout(fallbackTimer);
          setState("confirmed_pending_email");
          return;
        }

        if (confirm.trackEvent === "payment_confirmed") {
          trackEvent({
            name: "payment_confirmed",
            value: (confirm.amountCents ?? pixData.amountCents) / 100,
            booking_id: bookingId,
            currency: "BRL",
            coupon: confirm.couponCode ?? undefined,
          });
        }

        // Already showing "confirmed_pending_email" — data above is saved,
        // but don't flip the screen again.
        if (finalized) return;
        finalized = true;
        clearTimeout(fallbackTimer);
        setState("confirmed");
        setTimeout(() => router.push("/confirmacao"), 2000);
      })
      .catch((err) => {
        console.error("[Pagamento] confirmBooking threw:", err);
        if (finalized) return;
        finalized = true;
        clearTimeout(fallbackTimer);
        setState("confirmed_pending_email");
      });
  }, [bookingId, pixData, router]);

  // Polling for payment status.
  useEffect(() => {
    if (state !== "awaiting" || !pixData || !bookingId) return;

    pollRef.current = setInterval(async () => {
      let statusResult;
      try {
        statusResult = await checkPaymentStatus(pixData.mpPaymentId);
      } catch (err) {
        console.error("[Polling] checkPaymentStatus threw:", err);
        return;
      }
      if (statusResult.status !== "approved") return;
      handlePaymentApproved();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state, pixData, bookingId, handlePaymentApproved]);

  // Last-chance check when the PIX countdown reaches zero: confirms with
  // Mercado Pago directly whether the payment truly wasn't approved before
  // ever showing "expired". If MP itself can't be reached, we say so
  // explicitly instead of guessing.
  const verifyExpiry = useCallback(async () => {
    if (!pixData) return;
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await checkPaymentStatus(pixData.mpPaymentId);
        if (result.status === "approved") {
          handlePaymentApproved();
          return;
        }
        // MP gave us a real, non-error answer: it wasn't paid.
        setState("expired");
        return;
      } catch (err) {
        console.error("[Pagamento] verifyExpiry checkPaymentStatus threw:", err);
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
    // Every attempt failed to even reach Mercado Pago — we genuinely don't
    // know whether it was paid, so we say that instead of "expired".
    setState("expired_unverified");
  }, [pixData, handlePaymentApproved]);

  // Countdown timer
  useEffect(() => {
    if (state !== "awaiting" || !pixData) return;

    const expiresAt = new Date(pixData.expiresAt).getTime();

    countdownRef.current = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        setCountdown("00:00");
        setState("verifying_expiry");
        verifyExpiry();
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state, pixData, verifyExpiry]);

  const copyCode = useCallback(async () => {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    toast.success("Código PIX copiado!");
  }, [pixData]);

  function handleRetry() {
    if (bookingId) {
      runGeneratePix(bookingId, loadTriageData().couponCode);
    } else {
      initBooking();
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
            <div className="flex items-baseline justify-between text-base font-semibold">
              <span className="text-brand-forest-dark">Total</span>
              {pixData?.couponApplied ? (
                <span className="text-brand-forest">
                  {formatCentsToBRL(BASE_PRICE_CENTS)}
                  {" → "}
                  {formatCentsToBRL(pixData.amountCents)}
                  <span className="ml-1.5 text-xs font-medium text-brand-text-muted">
                    com cupom aplicado
                  </span>
                </span>
              ) : (
                <span className="text-brand-forest">
                  {formatCentsToBRL(pixData?.amountCents ?? BASE_PRICE_CENTS)}
                </span>
              )}
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

              {/* Email notice */}
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-sand/40 p-5">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-forest" />
                <p className="text-lg leading-relaxed text-brand-text-secondary">
                  Assim que identificarmos seu pagamento, a confirmação da consulta aparece aqui
                  nesta tela. Também enviaremos os detalhes e o link de acesso pelo Google Meet
                  para o e-mail cadastrado.
                </p>
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
            </motion.div>
          )}

          {/* Confirming: payment approved, confirmBooking still running.
              No back/retry/regenerate action here on purpose — the payment
              already went through. */}
          {state === "confirming" && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
                Pagamento aprovado!
              </h2>
              <p className="flex items-center gap-2 text-lg text-brand-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Estamos preparando sua consulta. Isso leva alguns segundos.
              </p>
            </motion.div>
          )}

          {/* Confirmed: confirmBooking succeeded, redirecting to /confirmacao. */}
          {state === "confirmed" && (
            <motion.div
              key="confirmed"
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
                Pagamento aprovado!
              </h2>
              <p className="text-sm text-brand-text-secondary">
                Redirecionando para a confirmação...
              </p>
            </motion.div>
          )}

          {/* Confirmed, but confirmBooking was slow or failed: never shown
              as an error and never offers to go back or retry — the
              payment is done. */}
          {state === "confirmed_pending_email" && (
            <motion.div
              key="confirmed_pending_email"
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
                Pagamento aprovado!
              </h2>
              <p className="max-w-md text-center text-lg leading-relaxed text-brand-text-secondary">
                Sua consulta está sendo confirmada. Os detalhes e o link de acesso pelo Google
                Meet serão enviados para o seu e-mail em alguns minutos.
              </p>
            </motion.div>
          )}

          {/* Verifying expiry: last-chance check with MP before ever
              claiming the PIX expired. No QR code, no countdown here. */}
          {state === "verifying_expiry" && (
            <motion.div
              key="verifying_expiry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
              <p className="text-sm text-brand-text-muted">Verificando seu pagamento...</p>
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
                onClick={() => bookingId && runGeneratePix(bookingId, loadTriageData().couponCode)}
                className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar novo código PIX
              </Button>
            </motion.div>
          )}

          {/* Expired, unverified: the countdown ran out but we couldn't
              reach Mercado Pago to confirm it wasn't paid, so we don't
              claim it expired. */}
          {state === "expired_unverified" && (
            <motion.div
              key="expired_unverified"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <AlertTriangle className="h-10 w-10 text-brand-warning" />
              <h2 className="text-lg font-semibold text-brand-forest-dark">
                Não conseguimos confirmar seu pagamento
              </h2>
              <p className="max-w-md text-center text-lg leading-relaxed text-brand-text-secondary">
                Se você já pagou, aguarde alguns minutos. Assim que identificarmos, enviaremos a
                confirmação e o link da consulta para o seu e-mail. Se ainda não pagou, gere um
                novo código.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => { setState("verifying_expiry"); verifyExpiry(); }}
                  className="bg-brand-forest text-brand-cream hover:bg-brand-forest-hover"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar novamente
                </Button>
                <Button
                  onClick={() => bookingId && runGeneratePix(bookingId, loadTriageData().couponCode)}
                  variant="outline"
                  className="border-brand-forest/20 text-brand-forest"
                >
                  Gerar novo código PIX
                </Button>
              </div>
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
                onClick={handleRetry}
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
