"use server";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendDoctorIntake, sendTeamIntake } from "@/lib/resend/send-intake";
import { appendToGoogleSheet } from "@/lib/google-sheets/append-row";
import { calculateAge } from "@/lib/utils/age";
import { maskCpf, maskPhone, maskCep } from "@/lib/utils/masks";
import {
  DURATION_LABELS,
  PRIOR_CBD_LABELS,
  PRIOR_TREATMENT_LABELS,
  getSymptomLabels,
} from "@/lib/utils/triagem-labels";

export interface PostPaymentInput {
  patient: {
    full_name: string;
    email: string;
    phone: string;        // digits only (raw)
    cpf: string;          // digits only (raw)
    rg: string;
    birth_date: string;   // YYYY-MM-DD
    address_street: string;
    address_number: string;
    address_complement?: string | null;
    address_district: string;
    address_city: string;
    address_state: string;
    address_zipcode: string; // digits only (raw)
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
  };
}

export async function dispatchPostPaymentSideEffects(
  input: PostPaymentInput
): Promise<void> {
  const { patient, doctor, booking, payment } = input;

  const scheduledAt = parseISO(booking.scheduled_at);
  const dateFormatted = format(scheduledAt, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const timeFormatted = format(scheduledAt, "HH:mm");
  const dateBR = format(scheduledAt, "dd/MM/yyyy");
  const dateBRShort = format(scheduledAt, "dd/MM");

  const birthDate = parseISO(patient.birth_date);
  const birthBR = format(birthDate, "dd/MM/yyyy");
  const age = calculateAge(birthDate);

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
  const cepFmt = maskCep(patient.address_zipcode);

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

  const lgpdAtBR = format(parseISO(patient.lgpd_consent_at), "dd/MM/yyyy HH:mm");
  const termsAtBR = format(parseISO(patient.terms_consent_at), "dd/MM/yyyy HH:mm");
  const paidAtBR = format(parseISO(payment.paid_at), "dd/MM/yyyy HH:mm");

  const amountFormatted = `R$ ${(payment.amount_cents / 100)
    .toFixed(2)
    .replace(".", ",")}`;
  const statusLabel = payment.status === "approved" ? "Aprovado" : payment.status;

  const addressLine = [
    patient.address_street,
    patient.address_number,
    patient.address_complement,
  ]
    .filter(Boolean)
    .join(", ");

  // 1. Doctor intake email
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
  });
  if (!doctorIntakeResult.success) {
    console.error("[PostPayment] Doctor intake failed:", doctorIntakeResult.error);
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
    patientRg: patient.rg,
    patientBirthDate: birthBR,
    patientAge: age,
    patientEmail: patient.email,
    patientPhone: phoneFmt,
    addressStreet: patient.address_street,
    addressNumber: patient.address_number,
    addressComplement: patient.address_complement ?? undefined,
    addressDistrict: patient.address_district,
    addressCity: patient.address_city,
    addressState: patient.address_state,
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
    subjectDate: dateBRShort,
  });
  if (!teamIntakeResult.success) {
    console.error("[PostPayment] Team intake failed:", teamIntakeResult.error);
  }

  // 3. Google Sheets row
  const sheetResult = await appendToGoogleSheet({
    Nome: patient.full_name,
    "Data Agendamento": dateBR,
    Horario: timeFormatted,
    Medico: doctor.name,
    CRM: crmFull,
    Paciente: patient.full_name,
    CPF: cpfFmt,
    RG: patient.rg,
    "Data Nascimento": birthBR,
    Email: patient.email,
    Telefone: phoneFmt,
    Endereco: addressLine,
    Cidade: patient.address_city,
    Estado: patient.address_state,
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
  });
  if (!sheetResult.success) {
    console.error("[PostPayment] Google Sheets failed:", sheetResult.error);
  }
}
