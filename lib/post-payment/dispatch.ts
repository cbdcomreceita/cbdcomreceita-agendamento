"use server";

import { parseISO } from "date-fns";
import { sendDoctorIntake, sendTeamIntake } from "@/lib/resend/send-intake";
import { appendToGoogleSheet } from "@/lib/google-sheets/append-row";
import { sendDispatchAlert, type DispatchFailure } from "@/lib/resend/send-dispatch-alert";
import { logError } from "@/lib/audit/log-error";
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

export interface PostPaymentInput {
  bookingId: string;
  /** True when the booking came through the light /dados form and still
   * needs the prontuário (RG/endereço) — Entrega 2. Adds a note to the
   * doctor's intake e-mail; the complete ficha follows in a second send
   * once /prontuario/[token] is submitted (see app/actions/submit-intake.ts). */
  intakeRequired?: boolean;
  patient: {
    full_name: string;
    email: string;
    phone: string;        // E.164 for new patients, digits only (raw) for pre-Entrega-1 ones
    cpf: string;          // digits only (raw) — always required, never pending
    // The six fields below are null when LIGHT_FORM_ENABLED was on at
    // booking time — the patient hasn't filled the prontuário yet
    // (Entrega 2). Every consumer below must show "Pendente" instead of
    // crashing on an empty/invalid value.
    rg: string | null;
    birth_date: string | null; // YYYY-MM-DD
    address_street: string | null;
    address_number: string | null;
    address_complement?: string | null;
    address_district: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zipcode: string | null; // digits only (raw)
    selected_symptoms: string[];
    has_current_medication: boolean;
    current_medications?: string | null;
    prior_cbd_use?: string | null;
    duration?: string | null;
    prior_treatment?: string | null;
    prior_treatment_details?: string | null;
    lgpd_consent_at: string; // ISO
    terms_consent_at: string; // ISO
  };
  doctor: {
    name: string;
    email: string;
    crm: string;
    crmUf: string;
  };
  booking: {
    scheduled_at: string;   // ISO
    meet_link?: string | null;
  };
  payment: {
    amount_cents: number;
    status: string;
    paid_at: string;        // ISO
    coupon_code?: string | null;
  };
}

export async function dispatchPostPaymentSideEffects(
  input: PostPaymentInput
): Promise<void> {
  const { bookingId, patient, doctor, booking, payment, intakeRequired } = input;

  const dateFormatted = formatDateLongNoTime(booking.scheduled_at);
  const timeFormatted = formatTime(booking.scheduled_at);
  const dateBR = formatDateBR(booking.scheduled_at);
  const dateBRShort = formatDateBRShort(booking.scheduled_at);

  // Birth date is a date-only string (YYYY-MM-DD) — append T12:00:00 to
  // anchor it at noon so timezone shifts can't cross day boundaries. Null
  // under LIGHT_FORM_ENABLED (not collected yet — pending the prontuário).
  const birthAnchored = patient.birth_date ? `${patient.birth_date}T12:00:00` : null;
  const birthBR = birthAnchored ? formatDateBR(birthAnchored) : "Pendente";
  const age = birthAnchored ? calculateAge(parseISO(birthAnchored)) : null;

  const symptomsLabels = getSymptomLabels(patient.selected_symptoms);
  const symptomsJoined = symptomsLabels.join(", ") || "—";

  const durationLabel = patient.duration
    ? DURATION_LABELS[patient.duration] ?? patient.duration
    : "Não informado";
  const priorCbdLabel = patient.prior_cbd_use
    ? PRIOR_CBD_LABELS[patient.prior_cbd_use] ?? patient.prior_cbd_use
    : "Não informado";
  const currentMedicationsLabel =
    patient.has_current_medication && patient.current_medications
      ? patient.current_medications
      : "Nenhum informado";

  const cpfFmt = maskCpf(patient.cpf);
  const phoneFmt = maskPhone(patient.phone);
  const cepFmt = patient.address_zipcode ? maskCep(patient.address_zipcode) : "Pendente";
  const rgFmt = patient.rg || "Pendente";
  const addressStreetFmt = patient.address_street || "Pendente";
  const addressNumberFmt = patient.address_number || "Pendente";
  const addressDistrictFmt = patient.address_district || "Pendente";
  const addressCityFmt = patient.address_city || "Pendente";
  const addressStateFmt = patient.address_state || "Pendente";

  const crmFull = `CRM ${doctor.crm}/${doctor.crmUf}`;
  const meetLink = booking.meet_link ?? undefined;

  // Build "Observações" from triage's prior treatment context
  let notes: string | undefined;
  if (patient.prior_treatment) {
    const tLabel = PRIOR_TREATMENT_LABELS[patient.prior_treatment] ?? patient.prior_treatment;
    notes = patient.prior_treatment_details
      ? `Tratamento anterior: ${tLabel} — ${patient.prior_treatment_details}`
      : `Tratamento anterior: ${tLabel}`;
  }

  const lgpdAtBR = formatDateTimeBR(patient.lgpd_consent_at);
  const termsAtBR = formatDateTimeBR(patient.terms_consent_at);
  const paidAtBR = formatDateTimeBR(payment.paid_at);

  const amountFormatted = formatCentsToBRL(payment.amount_cents);
  const statusLabel = payment.status === "approved" ? "Aprovado" : payment.status;

  const addressLine =
    [patient.address_street, patient.address_number, patient.address_complement]
      .filter(Boolean)
      .join(", ") || "Pendente";

  const failures: DispatchFailure[] = [];

  // 1. Doctor intake email — most critical: without it, the doctor doesn't
  // know about the consultation.
  const doctorIntakeResult = await sendDoctorIntake({
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    patientName: patient.full_name,
    patientCpf: cpfFmt,
    patientAge: age,
    patientPhone: phoneFmt,
    symptoms: symptomsJoined,
    currentMedications: currentMedicationsLabel,
    priorCbdUse: priorCbdLabel,
    dateFormatted,
    timeFormatted,
    subjectDate: dateBRShort,
    subjectTime: timeFormatted,
    intakePending: intakeRequired === true,
  });
  if (!doctorIntakeResult.success) {
    const detail = doctorIntakeResult.error ?? "erro desconhecido";
    console.error("[PostPayment] Doctor intake failed:", detail);
    failures.push({ step: "doctor_email", detail });
    await logError({
      scope: "dispatch",
      message: "Doctor intake e-mail failed",
      metadata: { detail, doctorEmail: doctor.email },
      entityType: "booking",
      entityId: bookingId,
    });
  }

  // 2. Team intake email
  const teamIntakeResult = await sendTeamIntake({
    doctorName: doctor.name,
    doctorCrm: crmFull,
    dateFormatted,
    timeFormatted,
    meetLink,
    patientName: patient.full_name,
    patientCpf: cpfFmt,
    patientRg: rgFmt,
    patientBirthDate: birthBR,
    patientAge: age,
    patientEmail: patient.email,
    patientPhone: phoneFmt,
    addressStreet: addressStreetFmt,
    addressNumber: addressNumberFmt,
    addressComplement: patient.address_complement ?? undefined,
    addressDistrict: addressDistrictFmt,
    addressCity: addressCityFmt,
    addressState: addressStateFmt,
    addressZipcode: cepFmt,
    symptoms: symptomsJoined,
    duration: durationLabel,
    currentMedications: currentMedicationsLabel,
    priorCbdUse: priorCbdLabel,
    notes,
    lgpdConsentAt: lgpdAtBR,
    termsConsentAt: termsAtBR,
    paymentAmount: amountFormatted,
    paymentStatus: statusLabel,
    paymentDate: paidAtBR,
    couponCode: payment.coupon_code,
    subjectDate: dateBRShort,
  });
  if (!teamIntakeResult.success) {
    const detail = teamIntakeResult.error ?? "erro desconhecido";
    console.error("[PostPayment] Team intake failed:", detail);
    failures.push({ step: "team_email", detail });
    await logError({
      scope: "dispatch",
      message: "Team intake e-mail failed",
      metadata: { detail },
      entityType: "booking",
      entityId: bookingId,
    });
  }

  // 3. Google Sheets row. "Nome" and "CPF" are always the contact/
  // responsible (who made the booking — this is who `patient` represents
  // under the light form) and never change at intake time. "Paciente" is
  // who's actually attending: same person as "Nome" for the old flow,
  // "Pendente" here when intake_required until /prontuario/[token] is
  // submitted (app/actions/submit-intake.ts updates just that column).
  const sheetResult = await appendToGoogleSheet({
    Tipo: "Agendamento confirmado",
    "Booking ID": bookingId,
    Nome: patient.full_name,
    "Data Agendamento": dateBR,
    Horario: timeFormatted,
    Medico: doctor.name,
    CRM: crmFull,
    Paciente: intakeRequired ? "Pendente" : patient.full_name,
    CPF: cpfFmt,
    RG: rgFmt,
    "Data Nascimento": birthBR,
    Email: patient.email,
    Telefone: phoneFmt,
    Endereco: addressLine,
    Cidade: addressCityFmt,
    Estado: addressStateFmt,
    CEP: cepFmt,
    Sintomas: symptomsJoined,
    "Ha quanto tempo": durationLabel,
    Medicamentos:
      patient.has_current_medication && patient.current_medications
        ? patient.current_medications
        : "Não",
    "Ja usou CBD": priorCbdLabel,
    Observacoes: notes ?? "",
    "Valor Pago": amountFormatted,
    "Status Pagamento": statusLabel,
    "Link Meet": meetLink ?? "Pendente",
    "Consentimento LGPD": lgpdAtBR,
    "Consentimento Termo": termsAtBR,
    Cupom: payment.coupon_code ?? "",
  });
  if (!sheetResult.success) {
    const detail = sheetResult.error ?? "erro desconhecido";
    console.error("[PostPayment] Google Sheets failed:", detail);
    failures.push({ step: "sheets", detail });
    await logError({
      scope: "dispatch",
      message: "Google Sheets append failed",
      metadata: { detail },
      entityType: "booking",
      entityId: bookingId,
    });
  }

  if (failures.length > 0) {
    await sendDispatchAlert({
      bookingId,
      patientName: patient.full_name,
      doctorName: doctor.name,
      dateBR,
      timeH: timeFormatted,
      failures,
    });
  }
}
