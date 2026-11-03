"use client";

import Image from "next/image";
import { Clock, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatTime } from "@/lib/utils/datetime";
import { formatCentsToBRL } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export interface PixPendingCardProps {
  qrCode: string;
  qrCodeBase64: string;
  amountCents: number;
  expiresAt: string;
  countdown: string;
}

/** Shared PIX-awaiting visuals — used by /pagamento (right after generating) and /pagamento/[token] (reopened via WhatsApp link). Approved copy, do not reword without checking with the team. */
export function PixPendingCard({ qrCode, qrCodeBase64, amountCents, expiresAt, countdown }: PixPendingCardProps) {
  async function copyCode() {
    await navigator.clipboard.writeText(qrCode);
    toast.success("Código PIX copiado!");
  }

  return (
    <div data-track="payment_initiated">
      <h2 className="text-center text-lg font-semibold text-brand-forest-dark">
        Seu PIX de {formatCentsToBRL(amountCents)} está pronto
      </h2>
      <p className="mt-1 text-center text-lg text-brand-text-secondary">
        Ele vale até {formatDateBR(expiresAt)} às {formatTime(expiresAt)} (horário de Brasília).
      </p>
      <p className="mt-1 text-center text-lg font-medium text-brand-text">
        A consulta só é confirmada após o pagamento.
      </p>

      <div className="mx-auto mt-6 flex items-center justify-center">
        {qrCodeBase64 ? (
          <div className="rounded-2xl border border-brand-sand/60 bg-white p-4">
            <Image
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              width={256}
              height={256}
              className="h-52 w-52 sm:h-64 sm:w-64"
            />
          </div>
        ) : (
          <div className="flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-brand-sand bg-brand-cream/50 sm:h-64 sm:w-64">
            <p className="text-center text-lg text-brand-text-muted">
              QR Code indisponível.<br />Use o código abaixo.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-lg text-brand-text-secondary">
        Copie o código e cole na área PIX do app do seu banco.
      </p>
      <div className="mt-3">
        <div className="flex items-center gap-2 rounded-xl border border-brand-sand/60 bg-brand-cream/30 p-3">
          <code className="flex-1 truncate text-sm text-brand-text-secondary">{qrCode}</code>
        </div>
        <Button
          onClick={copyCode}
          className="mt-3 w-full bg-brand-forest py-6 text-lg text-brand-cream hover:bg-brand-forest-hover"
        >
          <Copy className="mr-2 h-5 w-5" />
          Copiar código PIX
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-sand/40 p-5">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-forest" />
        <p className="text-lg leading-relaxed text-brand-text-secondary">
          Assim que identificarmos seu pagamento, a confirmação da consulta aparece aqui
          nesta tela. Também enviaremos os detalhes e o link de acesso pelo Google Meet
          para o e-mail cadastrado.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <Clock className={cn(
          "h-4 w-4 animate-pulse",
          countdown && parseInt(countdown) < 2 ? "text-brand-error" : "text-brand-forest-light"
        )} />
        <span className={cn(
          "text-lg font-medium",
          countdown && parseInt(countdown) < 2 ? "text-brand-error" : "text-brand-text-muted"
        )}>
          Este pagamento expira em {countdown}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-brand-cream/50 p-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-brand-warning" />
        <span className="text-lg text-brand-text-secondary">Aguardando pagamento...</span>
      </div>
    </div>
  );
}
