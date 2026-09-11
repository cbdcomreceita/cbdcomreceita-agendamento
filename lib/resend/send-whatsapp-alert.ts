"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";

export type WhatsappAlertReason =
  | "invalid_phone"
  | "missing_meet_link"
  | "auth_error"
  | "send_failed"
  | "verification_failed"
  | "card_error"
  | "unexpected_error"
  | "dispatch_failed"
  | "qstash_publish_failed"
  | "config_missing";

const REASON_LABELS: Record<WhatsappAlertReason, string> = {
  invalid_phone: "Telefone inválido — não foi possível normalizar para E.164",
  missing_meet_link: "Link do Google Meet ausente ou fora do formato esperado",
  auth_error: "Erro de autenticação com a API do NexTalk (401)",
  send_failed: "Falha ao enviar a mensagem de confirmação pelo WhatsApp",
  verification_failed: "Mensagem enviada, mas a verificação de entrega indicou falha",
  card_error: "Erro ao posicionar o card do paciente no funil do NexTalk",
  unexpected_error: "Erro inesperado no fluxo de confirmação por WhatsApp",
  dispatch_failed: "Agendamento confirmado, mas um aviso pós-pagamento pode não ter saído",
  qstash_publish_failed: "Falha ao publicar o job de confirmação por WhatsApp na fila (QStash)",
  config_missing: "Configuração do WhatsApp incompleta — nenhuma mensagem foi enviada",
};

/** Reason-specific guidance — the generic "envie manualmente pelo WhatsApp" doesn't fit every case. */
const WHAT_TO_DO: Record<WhatsappAlertReason, string> = {
  invalid_phone: "Verifique o telefone cadastrado e, se necessário, envie a confirmação manualmente pelo WhatsApp.",
  missing_meet_link: "Verifique o link da consulta no Cal.com e envie a confirmação manualmente pelo WhatsApp.",
  auth_error: "Verifique se o NEXTALK_API_TOKEN ainda é válido.",
  send_failed: "Verifique o agendamento e, se necessário, envie a confirmação manualmente pelo WhatsApp.",
  verification_failed: "Confirme diretamente com o paciente se a mensagem chegou.",
  card_error: "Verifique manualmente o card do paciente no funil de vendas do NexTalk.",
  unexpected_error: "Investigue o log técnico abaixo.",
  dispatch_failed: "Conferir manualmente.",
  qstash_publish_failed: "O paciente não vai receber a confirmação por WhatsApp automaticamente — envie manualmente e verifique a configuração do QStash (QSTASH_TOKEN/QSTASH_URL).",
  config_missing: "Nenhuma mensagem será enviada até a configuração ser corrigida — veja as variáveis faltantes no detalhe técnico abaixo.",
};

export interface SendWhatsappAlertParams {
  reason: WhatsappAlertReason;
  bookingId: string;
  patientName: string;
  /** Phone exactly as stored/typed — no normalization applied for display. */
  patientPhoneRaw: string;
  patientEmail: string;
  dateBR: string;
  timeH: string;
  doctorName: string;
  /** Technical detail for the team (error message, status code, etc). NEVER health data. */
  detail: string;
}

/**
 * Team-facing alert for a WhatsApp confirmation problem. NEVER include
 * symptoms, condition, or any other health data — only booking logistics.
 *
 * Always logs to audit_events first, independent of whether Resend actually
 * sends: lib/resend/client.ts returns {success:true} without sending when
 * RESEND_API_KEY is missing (mock mode), so Resend's reported success is not
 * proof an alert reached anyone.
 */
export async function sendWhatsappAlert(params: SendWhatsappAlertParams): Promise<void> {
  await logError({
    scope: "whatsapp",
    message: `Alert: ${REASON_LABELS[params.reason]}`,
    entityType: "booking",
    entityId: params.bookingId,
    metadata: {
      reason: params.reason,
      patientName: params.patientName,
      patientPhoneRaw: params.patientPhoneRaw,
      patientEmail: params.patientEmail,
      dateBR: params.dateBR,
      timeH: params.timeH,
      doctorName: params.doctorName,
      detail: params.detail,
    },
  });

  const alertEmail = process.env.WHATSAPP_ALERT_EMAIL;
  if (!alertEmail) {
    console.warn("[whatsapp] WHATSAPP_ALERT_EMAIL not configured — skipping alert email");
    return;
  }

  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping WhatsApp alert email (mock mode)");
    return;
  }

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: alertEmail,
      subject: `[WhatsApp] ${REASON_LABELS[params.reason]} — ${params.patientName}`,
      text: [
        `O que aconteceu: ${REASON_LABELS[params.reason]}`,
        `Detalhe técnico: ${params.detail}`,
        "",
        `O que fazer: ${WHAT_TO_DO[params.reason]}`,
        "",
        `Paciente: ${params.patientName}`,
        `Telefone: ${params.patientPhoneRaw}`,
        `E-mail: ${params.patientEmail}`,
        `Data: ${params.dateBR}`,
        `Horário: ${params.timeH}`,
        `Médico(a): ${params.doctorName}`,
        `Booking ID: ${params.bookingId}`,
      ].join("\n"),
    });

    if (error) {
      console.error("[whatsapp] Alert email send error:", error);
    }
  } catch (err) {
    console.error("[whatsapp] Alert email threw:", err);
  }
}
