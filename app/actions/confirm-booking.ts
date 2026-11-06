"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getMpPayment } from "@/lib/mercadopago/client";
import { createCalcomBooking } from "@/lib/calcom/bookings";
import { sendBookingConfirmation } from "@/lib/resend/send-confirmation";
import { dispatchPostPaymentSideEffects } from "@/lib/post-payment/dispatch";
import { logError } from "@/lib/audit/log-error";
import { publishSendConfirmation } from "@/lib/whatsapp/qstash";
import { orchestrateConfirmation } from "@/lib/whatsapp/orchestrate-confirmation";
import {
  checkWhatsappReadiness,
  getConfirmationMode,
  getDispatchMode,
  INLINE_DISPATCH_TIMEOUT_MS,
} from "@/lib/whatsapp/config";
import { sendWhatsappAlert } from "@/lib/resend/send-whatsapp-alert";
import { sendPaymentAfterExpiryAlert } from "@/lib/resend/send-payment-after-expiry-alert";
import { sendSlotConflictAlert } from "@/lib/resend/send-slot-conflict-alert";
import { sendSlotConflictPatientNotice } from "@/lib/resend/send-slot-conflict-patient-notice";
import { sendMetaConversionEvent } from "@/lib/analytics/meta-conversions-api";
import type { Doctor } from "@/lib/types/doctor";
import { formatDateLong, formatDateBR, formatTimeH } from "@/lib/utils/datetime";
import { formatCentsToBRL } from "@/lib/utils/currency";
import { formatIntakeDeadline } from "@/lib/intake/deadline";

export type ConfirmSource = "polling" | "webhook" | "cron";

export interface ConfirmBookingInput {
  bookingId: string;
  source: ConfirmSource;
  userFbc?: string;
  userFbp?: string;
}

export interface ConfirmBookingResult {
  success: boolean;
  meetLink?: string;
  alreadyProcessed?: boolean;
  error?: string;
  /** Client should fire this analytics event after receiving a successful response. */
  trackEvent?: "payment_confirmed";
  /** Amount actually charged (post-coupon), for accurate analytics. */
  amountCents?: number;
  couponCode?: string | null;
}

/**
 * Phase 2 of the new payment flow.
 *
 * Loads the booking + patient + payment + doctor from Supabase by ID and
 * runs all post-payment side effects: MP verification, Cal.com booking,
 * patient/doctor/team emails, Google Sheets row, and the audit trail.
 *
 * The action is idempotent: if the booking is already `confirmed`, it
 * returns the existing meet_link without re-running anything. Source
 * (polling/webhook/cron) is recorded in the audit event so we can tell
 * which path finalized each booking.
 *
 * Unlike the old confirmPayment, this no longer trusts sessionStorage —
 * the database is the single source of truth.
 */
export async function confirmBooking(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  const { bookingId, source } = input;
  const supabase = createServiceClient();

  console.log("[confirmBooking] invoked", { bookingId, source });

  // Audit invocation up front so we can prove the action ran even if a
  // later step throws before the success audit at the end.
  try {
    await supabase.from("audit_events").insert({
      event_type: "payment_confirm_started",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { source },
    });
  } catch (err) {
    console.error("[confirmBooking] failed to write start audit:", err);
  }

  try {
    // 1. Fetch booking with joined patient + payments + doctor
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, patients(*), payments(*), doctors(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      await logError({
        scope: "confirm",
        message: "Booking not found",
        metadata: { bookingId, error: bookingError },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: `Agendamento não encontrado: ${bookingId}` };
    }

    // 2. Idempotency
    if (booking.status === "confirmed") {
      await supabase.from("audit_events").insert({
        event_type: "payment_confirm_idempotent_skip",
        entity_type: "booking",
        entity_id: bookingId,
        metadata: { source, status: booking.status },
      });
      return {
        success: true,
        alreadyProcessed: true,
        meetLink: booking.meet_link ?? undefined,
      };
    }

    // 3. Verify MP if there's a real payment id
    type PaymentRow = {
      id: string;
      mp_payment_id: number | null;
      amount_cents: number;
      coupon_code: string | null;
    };
    const payments = (Array.isArray(booking.payments)
      ? booking.payments
      : booking.payments
        ? [booking.payments]
        : []) as PaymentRow[];
    const payment = payments[0];

    if (payment?.mp_payment_id) {
      const mp = await getMpPayment(payment.mp_payment_id);
      if (mp.status !== "approved") {
        await logError({
          scope: "confirm",
          message: "MP status not approved at confirm time",
          metadata: { bookingId, mpPaymentId: payment.mp_payment_id, mpStatus: mp.status, source },
          entityType: "booking",
          entityId: bookingId,
        });
        return {
          success: false,
          error: `MP status é ${mp.status}, esperado approved`,
        };
      }
    }

    // 4. Doctor comes straight from the joined doctors(*) row.
    const doctor = booking.doctors as Doctor | null;
    if (!doctor) {
      await logError({
        scope: "confirm",
        message: "Doctor not found via join",
        metadata: { bookingId, doctorId: booking.doctor_id },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Médico não encontrado" };
    }

    type PatientRow = {
      id: string;
      full_name: string;
      email: string;
      phone: string;
      cpf: string;
      // Null when the patient came through the LIGHT_FORM_ENABLED version
      // of /dados — collected later in the prontuário (Entrega 2).
      rg: string | null;
      birth_date: string | null;
      address_street: string | null;
      address_number: string | null;
      address_complement: string | null;
      address_district: string | null;
      address_city: string | null;
      address_state: string | null;
      address_zipcode: string | null;
      selected_symptoms: string[] | null;
      has_current_medication: boolean | null;
      current_medications: string | null;
      prior_cbd_use: string | null;
      lgpd_consent_at: string;
      terms_consent_at: string;
    };
    const patient = booking.patients as PatientRow | null;
    if (!patient) {
      await logError({
        scope: "confirm",
        message: "Patient not found via join",
        metadata: { bookingId },
        entityType: "booking",
        entityId: bookingId,
      });
      return { success: false, error: "Paciente não encontrado" };
    }

    // 3b. Late approval after expiry: the funnel cron (app/api/cron/funnel)
    // may have already marked this booking `expired` before Mercado Pago's
    // webhook got around to reporting it approved. If some OTHER booking
    // already holds a `confirmed` slot for the same doctor+scheduled_at in
    // the meantime, blindly continuing here would double-book the doctor
    // (step 6 below creates a brand-new Cal.com event unconditionally).
    // Our own bookings table is the source of truth for which slots we've
    // actually committed to Cal.com — checking Cal.com's live availability
    // instead would be both less reliable (its slots list doesn't reflect
    // bookings we haven't created yet) and racier.
    //
    // The payment is real regardless of the outcome below, so it is always
    // recorded as approved. Only the automated confirmation (Cal.com event,
    // patient email, WhatsApp) is withheld when there's a conflict — a
    // human resolves it via the TEAM_EMAIL alert.
    if (booking.status === "expired") {
      const { data: conflicting } = await supabase
        .from("bookings")
        .select("id")
        .eq("doctor_id", booking.doctor_id)
        .eq("scheduled_at", booking.scheduled_at)
        .eq("status", "confirmed")
        .neq("id", bookingId)
        .maybeSingle();

      if (conflicting) {
        if (payment) {
          await supabase
            .from("payments")
            .update({ status: "approved", paid_at: new Date().toISOString() })
            .eq("id", payment.id);
        }
        await supabase.from("audit_events").insert({
          event_type: "payment_after_expiry",
          entity_type: "booking",
          entity_id: bookingId,
          metadata: { source, conflictingBookingId: conflicting.id, paymentId: payment?.id ?? null },
        });
        await sendPaymentAfterExpiryAlert({
          bookingId,
          conflictingBookingId: conflicting.id,
          paymentId: payment?.id ?? null,
          patientName: patient.full_name,
          patientEmail: patient.email,
          patientPhone: patient.phone,
          doctorName: doctor.name,
          dateBR: formatDateBR(booking.scheduled_at),
          timeH: formatTimeH(booking.scheduled_at),
          amountFormatted: formatCentsToBRL(payment?.amount_cents ?? 4990),
        });
        return { success: false, error: "payment_after_expiry_slot_taken" };
      }
      // No conflict — the slot is still effectively free. Fall through to
      // the normal confirm flow below exactly as if booking.status were
      // still awaiting_payment.
    }

    // 5. Atomically claim the booking before any side effect runs.
    //
    // The step-2 idempotency check above reads `booking.status`, but reading
    // and then writing are two separate round trips — nothing stopped two
    // concurrent invocations (e.g. the client's polling tick and Mercado
    // Pago's webhook, both racing in after the same approval) from each
    // reading "not confirmed yet" and both proceeding. That's exactly what
    // happened in production on 2026-11-02 (booking d27321b8-75ee-4bd7-ba3b-
    // 6c0d27566d97): both ran Cal.com, patient/doctor/team e-mails and
    // Sheets — one Cal.com attempt collided and failed, but e-mails and
    // Sheets have no such collision and silently doubled.
    //
    // This UPDATE is the actual lock: Postgres serializes concurrent UPDATEs
    // on the same row, so only the first to commit can still match
    // `status IN (awaiting_payment, expired)` — by the time the second one's
    // UPDATE runs, the row already reads 'confirmed' and the WHERE no longer
    // matches, so `.select()` returns zero rows for it. No new intermediate
    // status/migration needed: 'confirmed' already meant "the authoritative
    // decision was made" in this codebase (side effects below were never
    // required to finish for status to say 'confirmed'), so using it as the
    // compare-and-swap target preserves that meaning exactly.
    const paidAt = new Date().toISOString();
    const { data: claimed } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .in("status", ["awaiting_payment", "expired"])
      .select("id")
      .maybeSingle();

    if (!claimed) {
      // Lost the race — another concurrent call is doing (or just did) the
      // real work. Re-read so a fast winner's meetLink is still returned.
      const { data: current } = await supabase
        .from("bookings")
        .select("meet_link")
        .eq("id", bookingId)
        .maybeSingle();
      await supabase.from("audit_events").insert({
        event_type: "payment_confirm_idempotent_skip",
        entity_type: "booking",
        entity_id: bookingId,
        metadata: { source, status: "lost_atomic_claim" },
      });
      return {
        success: true,
        alreadyProcessed: true,
        meetLink: current?.meet_link ?? undefined,
      };
    }

    if (payment) {
      await supabase
        .from("payments")
        .update({ status: "approved", paid_at: paidAt })
        .eq("id", payment.id);
    }

    // 6. Cal.com booking
    let meetLink: string | undefined;
    if (doctor.calcom_event_type_id) {
      const calResult = await createCalcomBooking({
        eventTypeId: doctor.calcom_event_type_id,
        scheduledAt: booking.scheduled_at,
        patientName: patient.full_name,
        patientEmail: patient.email,
        doctorName: doctor.name,
        notes: `Sintomas: ${(patient.selected_symptoms || []).join(", ")}`,
        metadata: { bookingId, source: `cbdcomreceita-${source}` },
      });

      if (calResult.success) {
        meetLink = calResult.meetLink;
        await supabase
          .from("bookings")
          .update({
            calcom_booking_id: calResult.bookingId,
            calcom_booking_uid: calResult.bookingUid,
            meet_link: calResult.meetLink,
          })
          .eq("id", bookingId);
      } else if (calResult.conflict) {
        // Entrega 3, item 2h — the reservation taken at PIX generation
        // normally prevents this (see generate-pix.ts's
        // slot_conflict_before_payment branch), but a payment approved
        // after that reservation already expired — or one generated while
        // AGENDA_3_NEXT_ENABLED was off — can still lose this exact race.
        // The payment is already marked approved above; it must never be
        // silently lost, so this never falls through to the normal
        // confirmation e-mails/WhatsApp/Sheets below (steps 7-8), which
        // would wrongly claim a consultation that doesn't exist.
        const { data: conflicting } = await supabase
          .from("bookings")
          .select("id")
          .eq("doctor_id", booking.doctor_id)
          .eq("scheduled_at", booking.scheduled_at)
          .eq("status", "confirmed")
          .neq("id", bookingId)
          .maybeSingle();

        await supabase
          .from("bookings")
          .update({ status: "payment_conflict" })
          .eq("id", bookingId);

        await supabase.from("audit_events").insert({
          event_type: "slot_conflict_after_payment",
          entity_type: "booking",
          entity_id: bookingId,
          metadata: { source, conflictingBookingId: conflicting?.id ?? null, paymentId: payment?.id ?? null },
        });

        const dateBR = formatDateBR(booking.scheduled_at);
        const timeH = formatTimeH(booking.scheduled_at);
        await sendSlotConflictAlert({
          bookingId,
          conflictingBookingId: conflicting?.id ?? null,
          paymentId: payment?.id ?? null,
          patientName: patient.full_name,
          patientEmail: patient.email,
          patientPhone: patient.phone,
          doctorName: doctor.name,
          dateBR,
          timeH,
          amountFormatted: formatCentsToBRL(payment?.amount_cents ?? 4990),
        });
        await sendSlotConflictPatientNotice({
          bookingId,
          patientName: patient.full_name,
          patientEmail: patient.email,
          doctorName: doctor.name,
          dateBR,
          timeH,
        });

        return { success: false, error: "slot_conflict_after_payment" };
      }
    }

    // 7. Patient confirmation email
    const dateFormatted = formatDateLong(booking.scheduled_at);
    const amountCents = payment?.amount_cents ?? 4990;
    await sendBookingConfirmation({
      patientName: patient.full_name,
      patientEmail: patient.email,
      doctorName: doctor.name,
      doctorCrm: doctor.crm ? `CRM ${doctor.crm}/${doctor.crm_uf}` : undefined,
      dateFormatted,
      duration: "25 minutos",
      meetLink,
      amountFormatted: formatCentsToBRL(amountCents),
      intakeRequired: booking.intake_required === true,
      intakeDeadline: booking.intake_required === true ? formatIntakeDeadline(booking.scheduled_at) : undefined,
    });

    // 8. Doctor intake + team intake + Google Sheets
    type TriageJson = {
      duration?: string | null;
      priorTreatment?: string | null;
      priorTreatmentDetails?: string | null;
    };
    const triageData = (booking.triage_data ?? {}) as TriageJson;

    // Reused by both alert calls below.
    const dateBR = formatDateBR(booking.scheduled_at);
    const timeH = formatTimeH(booking.scheduled_at);

    // dispatchPostPaymentSideEffects handles its own per-step failures
    // (doctor/team e-mail, sheets) without throwing — this try/catch is
    // just a last-resort safety net for a truly unexpected error, so it
    // can't prevent the WhatsApp confirmation below from firing.
    try {
      await dispatchPostPaymentSideEffects({
        bookingId,
        intakeRequired: booking.intake_required === true,
        patient: {
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          cpf: patient.cpf,
          rg: patient.rg,
          birth_date: patient.birth_date,
          address_street: patient.address_street,
          address_number: patient.address_number,
          address_complement: patient.address_complement,
          address_district: patient.address_district,
          address_city: patient.address_city,
          address_state: patient.address_state,
          address_zipcode: patient.address_zipcode,
          selected_symptoms: patient.selected_symptoms ?? [],
          has_current_medication: patient.has_current_medication ?? false,
          current_medications: patient.current_medications,
          prior_cbd_use: patient.prior_cbd_use,
          duration: triageData.duration ?? null,
          prior_treatment: triageData.priorTreatment ?? null,
          prior_treatment_details: triageData.priorTreatmentDetails ?? null,
          lgpd_consent_at: patient.lgpd_consent_at,
          terms_consent_at: patient.terms_consent_at,
        },
        doctor: {
          name: doctor.name,
          email: doctor.email,
          crm: doctor.crm,
          crmUf: doctor.crm_uf,
        },
        booking: {
          scheduled_at: booking.scheduled_at,
          meet_link: meetLink ?? null,
        },
        payment: {
          amount_cents: amountCents,
          status: "approved",
          paid_at: paidAt,
          coupon_code: payment?.coupon_code ?? null,
        },
      });
    } catch (err) {
      await logError({
        scope: "confirm",
        message: "dispatchPostPaymentSideEffects threw",
        metadata: { error: String(err), bookingId },
        entityType: "booking",
        entityId: bookingId,
      });
      await sendWhatsappAlert({
        reason: "dispatch_failed",
        bookingId,
        patientName: patient.full_name,
        patientPhoneRaw: patient.phone,
        patientEmail: patient.email,
        dateBR,
        timeH,
        doctorName: doctor.name,
        detail: `O agendamento foi confirmado, mas o aviso ao médico, o e-mail da equipe ou a planilha podem não ter saído. Conferir manualmente. Erro técnico: ${String(err)}`,
      });
    }

    // 8b. WhatsApp confirmation via NexTalk — isolated the same way: never
    // allowed to block/delay/break the rest of confirmBooking.
    const whatsappMode = getConfirmationMode();
    if (whatsappMode !== "off") {
      const readiness = checkWhatsappReadiness();
      if (!readiness.ready) {
        await logError({
          scope: "whatsapp",
          message: `WhatsApp confirmation mode is "${whatsappMode}" but required config is missing`,
          metadata: { bookingId, mode: whatsappMode, missing: readiness.missing },
          entityType: "booking",
          entityId: bookingId,
        });
        await sendWhatsappAlert({
          reason: "config_missing",
          bookingId,
          patientName: patient.full_name,
          patientPhoneRaw: patient.phone,
          patientEmail: patient.email,
          dateBR,
          timeH,
          doctorName: doctor.name,
          detail: `Modo "${whatsappMode}" ativo, mas faltam as variáveis: ${readiness.missing.join(", ")}. Nenhuma mensagem foi enviada para este agendamento.`,
        });
      } else if (getDispatchMode() === "inline") {
        // No QStash in this mode — call the same flow QStash would have
        // triggered directly, bounded so a slow/stuck NexTalk can't starve
        // the remaining steps below (Meta conversion, final audit write).
        // orchestrateConfirmation never throws on its own; this only fires
        // if it's still running past the timeout.
        const TIMED_OUT = Symbol("inline-whatsapp-timeout");
        const result = await Promise.race([
          orchestrateConfirmation(bookingId).then(() => "done" as const),
          new Promise<typeof TIMED_OUT>((resolve) =>
            setTimeout(() => resolve(TIMED_OUT), INLINE_DISPATCH_TIMEOUT_MS)
          ),
        ]);
        if (result === TIMED_OUT) {
          await logError({
            scope: "whatsapp",
            message: "Inline WhatsApp dispatch exceeded the timeout",
            metadata: { bookingId, timeoutMs: INLINE_DISPATCH_TIMEOUT_MS },
            entityType: "booking",
            entityId: bookingId,
          });
          await sendWhatsappAlert({
            reason: "send_failed",
            bookingId,
            patientName: patient.full_name,
            patientPhoneRaw: patient.phone,
            patientEmail: patient.email,
            dateBR,
            timeH,
            doctorName: doctor.name,
            detail: `Envio inline pelo WhatsApp excedeu ${INLINE_DISPATCH_TIMEOUT_MS / 1000}s e foi abandonado nesta requisição (pode ainda concluir em segundo plano). Confirme manualmente se a mensagem chegou.`,
          });
        }
      } else {
        try {
          await publishSendConfirmation(bookingId);
        } catch (err) {
          await logError({
            scope: "whatsapp",
            message: "Failed to publish send-confirmation job to QStash",
            metadata: { error: String(err), bookingId },
            entityType: "booking",
            entityId: bookingId,
          });
          await sendWhatsappAlert({
            reason: "qstash_publish_failed",
            bookingId,
            patientName: patient.full_name,
            patientPhoneRaw: patient.phone,
            patientEmail: patient.email,
            dateBR,
            timeH,
            doctorName: doctor.name,
            detail: `Falha ao publicar o job de confirmação no QStash: ${String(err)}`,
          });
        }
      }
    }

    // 9. Meta Conversions API (server-side, fire-and-forget style — errors are caught internally)
    await sendMetaConversionEvent({
      eventName: "Purchase",
      bookingId,
      value: amountCents / 100,
      userEmail: patient.email,
      userPhone: patient.phone,
      userFbc: input.userFbc,
      userFbp: input.userFbp,
    });

    // 10. Audit
    const eventType =
      source === "webhook"
        ? "payment_confirmed_via_webhook"
        : source === "cron"
          ? "payment_confirmed_via_cron"
          : "payment_confirmed_via_polling";
    await supabase.from("audit_events").insert({
      event_type: eventType,
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { source, meetLink, doctorId: doctor.id },
    });

    return {
      success: true,
      meetLink,
      trackEvent: "payment_confirmed" as const,
      amountCents,
      couponCode: payment?.coupon_code ?? null,
    };
  } catch (err) {
    await logError({
      scope: "confirm",
      message: "Unhandled error in confirmBooking",
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
        bookingId,
        source,
      },
      entityType: "booking",
      entityId: bookingId,
    });
    return { success: false, error: String(err) };
  }
}
