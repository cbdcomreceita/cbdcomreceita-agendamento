"use server";

import { headers } from "next/headers";
import { parseISO } from "date-fns";
import { createServiceClient } from "@/lib/supabase/server";
import { logError } from "@/lib/audit/log-error";
import { stripPaymentTokenPrefix } from "@/lib/utils/payment-token";
import { rateLimiters, tryCheckRateLimit, getClientIp, maskIp } from "@/lib/rate-limit";
import { intakeSchema, type IntakeFormData } from "@/lib/validation/intake";
import { sendDoctorIntake, sendTeamIntake } from "@/lib/resend/send-intake";
import { updateGoogleSheetRow } from "@/lib/google-sheets/update-row";
import { calculateAge } from "@/lib/utils/age";
import { maskCpf, maskPhone, maskCep } from "@/lib/utils/masks";
import {
  formatDateBR,
  formatDateBRShort,
  formatDateLongNoTime,
  formatDateTimeBR,
  formatTime,
} from "@/lib/utils/datetime";
import {
  DURATION_LABELS,
  PRIOR_CBD_LABELS,
  PRIOR_TREATMENT_LABELS,
  getSymptomLabels,
} from "@/lib/utils/triagem-labels";
import { formatCentsToBRL } from "@/lib/utils/currency";

export interface SubmitIntakeInput {
  token: string;
  data: IntakeFormData;
}

export interface SubmitIntakeResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  retryAfter?: number;
}

/**
 * Submits /prontuario/[token] — the counterpart to the light /dados form:
 * fills in RG, nascimento and endereço on the existing patient record,
 * marks intake_completed_at, and re-sends the doctor's intake e-mail (now
 * complete) plus a Sheets row marked as an update. Never touches
 * triage/clinical fields — those were already collected and sent at
 * payment time (dispatchPostPaymentSideEffects).
 */
export async function submitIntake(input: SubmitIntakeInput): Promise<SubmitIntakeResult> {
  const token = stripPaymentTokenPrefix(input.token.trim());
  if (!token) return { success: false, error: "Token inválido" };

  const supabase = createServiceClient();

  const reqHeaders = await headers();
  const ip = getClientIp(reqHeaders);
  const rl = await tryCheckRateLimit(rateLimiters.intake, ip);
  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    await supabase.from("audit_events").insert({
      event_type: "rate_limit_exceeded",
      entity_type: "rate_limit",
      metadata: { endpoint: "submit-intake", ip: maskIp(ip) },
    });
    return { success: false, error: "rate_limit_exceeded", retryAfter: retryAfterSec };
  }

  const parsed = intakeSchema.safeParse(input.data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, error: "Dados inválidos", fieldErrors };
  }
  const form = parsed.data;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, patient_id, scheduled_at, scheduled_end_at, meet_link, intake_required, intake_completed_at, triage_data, patients(*), doctors(*), payments(*)"
    )
    .eq("intake_token", token)
    .eq("intake_required", true)
    .maybeSingle();

  if (bookingError || !booking) {
    await logError({
      scope: "create",
      message: "submitIntake: booking not found",
      metadata: { error: bookingError },
    });
    return { success: false, error: "Agendamento não encontrado" };
  }

  if (booking.intake_completed_at) {
    // Already submitted — idempotent no-op, not an error (a resubmit via a
    // stale tab shouldn't look like a failure to the patient).
    return { success: true };
  }

  const endIso =
    booking.scheduled_end_at ?? new Date(new Date(booking.scheduled_at).getTime() + 25 * 60 * 1000).toISOString();
  if (new Date(endIso).getTime() < Date.now()) {
    return { success: false, error: "Este link não está mais disponível" };
  }

  type PatientRow = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    cpf: string;
    selected_symptoms: string[] | null;
    has_current_medication: boolean | null;
    current_medications: string | null;
    prior_cbd_use: string | null;
    lgpd_consent_at: string;
    terms_consent_at: string;
  };
  type DoctorRow = { name: string; email: string; crm: string; crm_uf: string };
  type PaymentRow = { amount_cents: number; status: string; paid_at: string | null; coupon_code: string | null };

  const patient = booking.patients as unknown as PatientRow | null;
  const doctor = booking.doctors as unknown as DoctorRow | null;
  const payments = (Array.isArray(booking.payments) ? booking.payments : booking.payments ? [booking.payments] : []) as PaymentRow[];
  const payment = payments[0];
  if (!patient || !doctor) {
    await logError({
      scope: "create",
      message: "submitIntake: missing patient/doctor join",
      metadata: { bookingId: booking.id },
    });
    return { success: false, error: "Agendamento incompleto" };
  }

  // 1. Fill in the fields the light form left out.
  const { error: patientUpdateError } = await supabase
    .from("patients")
    .update({
      rg: form.rg,
      birth_date: form.birthDate,
      address_street: form.street,
      address_number: form.number,
      address_complement: form.complement || null,
      address_district: form.district,
      address_city: form.city,
      address_state: form.state,
      address_zipcode: form.cep,
    })
    .eq("id", booking.patient_id);

  if (patientUpdateError) {
    await logError({
      scope: "create",
      message: "submitIntake: patient update failed",
      metadata: { error: patientUpdateError, bookingId: booking.id },
    });
    return { success: false, error: "Erro ao salvar seus dados" };
  }

  // 2. Mark the booking's intake as complete — point update by id, the
  // cron's "intake_required=true AND intake_completed_at IS NULL" scan
  // stops matching this booking from here on.
  const completedAt = new Date().toISOString();
  await supabase.from("bookings").update({ intake_completed_at: completedAt }).eq("id", booking.id);

  await supabase.from("audit_events").insert({
    event_type: "intake_completed",
    entity_type: "booking",
    entity_id: booking.id,
    metadata: {},
  });

  // 3. Second doctor e-mail (now complete) + team e-mail + Sheets update —
  // best-effort: the patient's data is already saved regardless of whether
  // these notifications succeed.
  type TriageJson = { duration?: string | null; priorTreatment?: string | null; priorTreatmentDetails?: string | null };
  const triageData = (booking.triage_data ?? {}) as TriageJson;

  const dateFormatted = formatDateLongNoTime(booking.scheduled_at);
  const timeFormatted = formatTime(booking.scheduled_at);
  const dateBR = formatDateBR(booking.scheduled_at);
  const dateBRShort = formatDateBRShort(booking.scheduled_at);
  const birthAnchored = `${form.birthDate}T12:00:00`;
  const age = calculateAge(parseISO(birthAnchored));
  const symptomsJoined = getSymptomLabels(patient.selected_symptoms ?? []).join(", ") || "—";
  const durationLabel = triageData.duration ? DURATION_LABELS[triageData.duration] ?? triageData.duration : "Não informado";
  const priorCbdLabel = patient.prior_cbd_use ? PRIOR_CBD_LABELS[patient.prior_cbd_use] ?? patient.prior_cbd_use : "Não informado";
  const currentMedicationsLabel =
    patient.has_current_medication && patient.current_medications ? patient.current_medications : "Nenhum informado";
  let notes: string | undefined;
  if (triageData.priorTreatment) {
    const tLabel = PRIOR_TREATMENT_LABELS[triageData.priorTreatment] ?? triageData.priorTreatment;
    notes = triageData.priorTreatmentDetails
      ? `Tratamento anterior: ${tLabel} — ${triageData.priorTreatmentDetails}`
      : `Tratamento anterior: ${tLabel}`;
  }

  const doctorResult = await sendDoctorIntake({
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    patientName: patient.full_name,
    patientCpf: maskCpf(patient.cpf),
    patientAge: age,
    patientPhone: maskPhone(patient.phone),
    symptoms: symptomsJoined,
    currentMedications: currentMedicationsLabel,
    priorCbdUse: priorCbdLabel,
    dateFormatted,
    timeFormatted,
    subjectDate: dateBRShort,
    subjectTime: timeFormatted,
    intakePending: false,
  });
  if (!doctorResult.success) {
    await logError({
      scope: "resend",
      message: "submitIntake: second doctor intake e-mail failed",
      metadata: { error: doctorResult.error, bookingId: booking.id },
    });
  }

  const teamResult = await sendTeamIntake({
    doctorName: doctor.name,
    doctorCrm: `CRM ${doctor.crm}/${doctor.crm_uf}`,
    dateFormatted,
    timeFormatted,
    meetLink: booking.meet_link ?? undefined,
    patientName: patient.full_name,
    patientCpf: maskCpf(patient.cpf),
    patientRg: form.rg,
    patientBirthDate: formatDateBR(birthAnchored),
    patientAge: age,
    patientEmail: patient.email,
    patientPhone: maskPhone(patient.phone),
    addressStreet: form.street,
    addressNumber: form.number,
    addressComplement: form.complement,
    addressDistrict: form.district,
    addressCity: form.city,
    addressState: form.state,
    addressZipcode: maskCep(form.cep),
    symptoms: symptomsJoined,
    duration: durationLabel,
    currentMedications: currentMedicationsLabel,
    priorCbdUse: priorCbdLabel,
    notes,
    lgpdConsentAt: formatDateTimeBR(patient.lgpd_consent_at),
    termsConsentAt: formatDateTimeBR(patient.terms_consent_at),
    paymentAmount: formatCentsToBRL(payment?.amount_cents ?? 4990),
    paymentStatus: payment?.status === "approved" ? "Aprovado" : (payment?.status ?? "—"),
    paymentDate: payment?.paid_at ? formatDateTimeBR(payment.paid_at) : "—",
    couponCode: payment?.coupon_code,
    subjectDate: dateBRShort,
  });
  if (!teamResult.success) {
    await logError({
      scope: "resend",
      message: "submitIntake: team intake e-mail failed",
      metadata: { error: teamResult.error, bookingId: booking.id },
    });
  }

  const sheetResult = await updateGoogleSheetRow(booking.id, {
    Nome: patient.full_name,
    RG: form.rg,
    "Data Nascimento": formatDateBR(birthAnchored),
    Endereco: [form.street, form.number, form.complement].filter(Boolean).join(", "),
    Bairro: form.district,
    Cidade: form.city,
    Estado: form.state,
    CEP: maskCep(form.cep),
    "Data Agendamento": dateBR,
    Horario: timeFormatted,
    Medico: doctor.name,
  });
  if (!sheetResult.success) {
    await logError({
      scope: "sheets",
      message: "submitIntake: Sheets update failed",
      metadata: { error: sheetResult.error, bookingId: booking.id },
    });
  }

  return { success: true };
}
