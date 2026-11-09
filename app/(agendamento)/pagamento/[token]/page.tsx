"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateLong } from "@/lib/utils/datetime";
import { getPaymentByToken } from "@/app/actions/get-payment-by-token";
import { checkPaymentStatus } from "@/lib/mercadopago/actions";
import { confirmBooking } from "@/app/actions/confirm-booking";
import { PixPendingCard } from "@/components/fluxo/pix-pending-card";
import { PixExpiredCard } from "@/components/fluxo/pix-expired-card";
import { trackEvent } from "@/lib/analytics/track";

type PageState =
  | "loading"
  | "not_found"
  | "awaiting"
  | "verifying_expiry"
  | "expired"
  | "confirming"
  | "confirmed";

interface Loaded {
  bookingId: string;
  doctorName: string;
  doctorCrm: string;
  patientName: string;
  scheduledAt: string;
  mpPaymentId: number | null;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  amountCents: number;
  meetLink: string | null;
}

const POLL_INTERVAL = 5000;

export default function PagamentoTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<Loaded | null>(null);
  const [countdown, setCountdown] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const approvalHandledRef = useRef(false);

  useEffect(() => {
    getPaymentByToken(params.token).then((result) => {
      if (!result.found || !result.bookingId) {
        setState("not_found");
        return;
      }

      if (result.paymentStatus === "approved") {
        setData({
          bookingId: result.bookingId,
          doctorName: result.doctorName!,
          doctorCrm: result.doctorCrm!,
          patientName: result.patientName!,
          scheduledAt: result.scheduledAt!,
          mpPaymentId: result.mpPaymentId ?? null,
          qrCode: result.qrCode ?? "",
          qrCodeBase64: result.qrCodeBase64 ?? "",
          expiresAt: result.expiresAt ?? "",
          amountCents: result.amountCents ?? 0,
          meetLink: result.meetLink ?? null,
        });
        setState("confirmed");
        return;
      }

      if (result.paymentStatus === "expired" || result.bookingStatus === "expired") {
        setState("expired");
        return;
      }

      if (result.paymentStatus !== "pending" || !result.qrCode) {
        setState("not_found");
        return;
      }

      setData({
        bookingId: result.bookingId,
        doctorName: result.doctorName!,
        doctorCrm: result.doctorCrm!,
        patientName: result.patientName!,
        scheduledAt: result.scheduledAt!,
        mpPaymentId: result.mpPaymentId ?? null,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64 ?? "",
        expiresAt: result.expiresAt!,
        amountCents: result.amountCents ?? 0,
        meetLink: result.meetLink ?? null,
      });
      setState("awaiting");
    });
  }, [params.token]);

  // Mirrors handlePaymentApproved in /pagamento, minus Meta fbc/fbp (not
  // available on a reopened link) — confirmBooking is idempotent, so
  // calling it again here even if the original tab already did is safe.
  const handleApproved = useCallback(() => {
    if (approvalHandledRef.current || !data) return;
    approvalHandledRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState("confirming");

    confirmBooking({ bookingId: data.bookingId, source: "polling" })
      .then((confirm) => {
        if (confirm.trackEvent === "payment_confirmed") {
          trackEvent({
            name: "payment_confirmed",
            value: (confirm.amountCents ?? data.amountCents) / 100,
            booking_id: data.bookingId,
            currency: "BRL",
            coupon: confirm.couponCode ?? undefined,
          });
        }
        setData((prev) => (prev ? { ...prev, meetLink: confirm.meetLink ?? prev.meetLink } : prev));
        setState("confirmed");
      })
      .catch(() => setState("confirmed"));
  }, [data]);

  useEffect(() => {
    if (state !== "awaiting" || !data) return;
    pollRef.current = setInterval(async () => {
      let result;
      try {
        result = await checkPaymentStatus(data.mpPaymentId);
      } catch {
        return;
      }
      if (result.status === "approved") handleApproved();
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state, data, handleApproved]);

  const verifyExpiry = useCallback(async () => {
    if (!data) return;
    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await checkPaymentStatus(data.mpPaymentId);
        if (result.status === "approved") {
          handleApproved();
          return;
        }
        setState("expired");
        return;
      } catch {
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setState("expired");
  }, [data, handleApproved]);

  useEffect(() => {
    if (state !== "awaiting" || !data) return;
    const expiresAt = new Date(data.expiresAt).getTime();
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
  }, [state, data, verifyExpiry]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl">
        Pagamento
      </h1>

      {data && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-brand-sand/60 bg-white p-4">
            <div className="grid gap-2 text-lg">
              <div className="flex justify-between">
                <span className="text-brand-text-muted">Médico</span>
                <span className="text-brand-text">{data.doctorName} — CRM {data.doctorCrm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-muted">Data</span>
                <span className="capitalize text-brand-text">{formatDateLong(data.scheduledAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-muted">Paciente</span>
                <span className="text-brand-text">{data.patientName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-brand-sand/60 bg-white p-6 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
              <p className="text-lg text-brand-text-muted">Carregando...</p>
            </motion.div>
          )}

          {state === "not_found" && (
            <motion.div
              key="not_found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <AlertTriangle className="h-10 w-10 text-brand-warning" />
              <h2 className="text-lg font-semibold text-brand-forest-dark">
                Não encontramos esse pagamento
              </h2>
              <p className="max-w-md text-center text-lg text-brand-text-secondary">
                O link pode estar incorreto ou incompleto. Se você recebeu esse link pelo
                WhatsApp, confira se copiou o endereço inteiro.
              </p>
            </motion.div>
          )}

          {state === "awaiting" && data && (
            <motion.div key="awaiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PixPendingCard
                qrCode={data.qrCode}
                qrCodeBase64={data.qrCodeBase64}
                amountCents={data.amountCents}
                countdown={countdown}
              />
            </motion.div>
          )}

          {state === "verifying_expiry" && (
            <motion.div
              key="verifying_expiry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-brand-forest-light" />
              <p className="text-lg text-brand-text-muted">Verificando seu pagamento...</p>
            </motion.div>
          )}

          {state === "expired" && (
            <PixExpiredCard onChooseNewTime={() => router.push("/agenda")} />
          )}

          {(state === "confirming" || state === "confirmed") && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-success/10"
              >
                <CheckCircle2 className="h-8 w-8 text-brand-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-brand-forest-dark">Pagamento aprovado!</h2>
              <p className="max-w-md text-center text-lg leading-relaxed text-brand-text-secondary">
                {data?.meetLink
                  ? "Sua consulta está confirmada. Os detalhes e o link de acesso pelo Google Meet também foram enviados para o seu e-mail."
                  : "Sua consulta está sendo confirmada. Os detalhes e o link de acesso pelo Google Meet serão enviados para o seu e-mail em alguns minutos."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
