"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { PatientIntakeDoctorEmail } from "@/emails/patient-intake-doctor";
import { PatientIntakeTeamEmail } from "@/emails/patient-intake-team";

const TEAM_EMAIL = process.env.TEAM_EMAIL || "contato@cbdcomreceita.com.br";

export interface DoctorIntakeParams {
  doctorName: string;
  doctorEmail: string;
  patientName: string;
  patientCpf: string;
  patientAge: number;
  patientPhone: string;
  symptoms: string;
  currentMedications: string;
  priorCbdUse: string;
  dateFormatted: string;
  timeFormatted: string;
  subjectDate: string; // dd/MM
  subjectTime: string; // HH:mm
}

export async function sendDoctorIntake(
  params: DoctorIntakeParams
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Resend] Sending doctor intake to: ${params.doctorEmail}`);
  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping doctor intake (mock mode)");
    return { success: true };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: params.doctorEmail,
      subject: `Consulta ${params.subjectDate} ${params.subjectTime} — ${params.patientName}`,
      react: PatientIntakeDoctorEmail({
        doctorName: params.doctorName,
        patientName: params.patientName,
        patientCpf: params.patientCpf,
        patientAge: params.patientAge,
        patientPhone: params.patientPhone,
        symptoms: params.symptoms,
        currentMedications: params.currentMedications,
        priorCbdUse: params.priorCbdUse,
        dateFormatted: params.dateFormatted,
        timeFormatted: params.timeFormatted,
      }),
    });

    if (error) {
      console.error("[Resend] Doctor intake send error:", JSON.stringify(error));
      return { success: false, error: error.message };
    }
    console.log("[Resend] Doctor intake sent. id:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("[Resend] Doctor intake failed:", err);
    return { success: false, error: String(err) };
  }
}

export interface TeamIntakeParams {
  // Consulta
  doctorName: string;
  doctorCrm: string;
  dateFormatted: string;
  timeFormatted: string;
  meetLink?: string;
  // Paciente
  patientName: string;
  patientCpf: string;
  patientRg: string;
  patientBirthDate: string;
  patientAge: number;
  patientEmail: string;
  patientPhone: string;
  // Endereço
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  // Triagem
  symptoms: string;
  duration: string;
  currentMedications: string;
  priorCbdUse: string;
  notes?: string;
  // Consentimento
  lgpdConsentAt: string;
  termsConsentAt: string;
  // Pagamento
  paymentAmount: string;
  paymentStatus: string;
  paymentDate: string;
  // Subject helpers
  subjectDate: string; // dd/MM
}

export async function sendTeamIntake(
  params: TeamIntakeParams
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Resend] Sending team intake to: ${TEAM_EMAIL}`);
  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping team intake (mock mode)");
    return { success: true };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: TEAM_EMAIL,
      subject: `Nova consulta: ${params.patientName} — ${params.subjectDate} — ${params.doctorName}`,
      react: PatientIntakeTeamEmail({
        doctorName: params.doctorName,
        doctorCrm: params.doctorCrm,
        dateFormatted: params.dateFormatted,
        timeFormatted: params.timeFormatted,
        meetLink: params.meetLink,
        patientName: params.patientName,
        patientCpf: params.patientCpf,
        patientRg: params.patientRg,
        patientBirthDate: params.patientBirthDate,
        patientAge: params.patientAge,
        patientEmail: params.patientEmail,
        patientPhone: params.patientPhone,
        addressStreet: params.addressStreet,
        addressNumber: params.addressNumber,
        addressComplement: params.addressComplement,
        addressDistrict: params.addressDistrict,
        addressCity: params.addressCity,
        addressState: params.addressState,
        addressZipcode: params.addressZipcode,
        symptoms: params.symptoms,
        duration: params.duration,
        currentMedications: params.currentMedications,
        priorCbdUse: params.priorCbdUse,
        notes: params.notes,
        lgpdConsentAt: params.lgpdConsentAt,
        termsConsentAt: params.termsConsentAt,
        paymentAmount: params.paymentAmount,
        paymentStatus: params.paymentStatus,
        paymentDate: params.paymentDate,
      }),
    });

    if (error) {
      console.error("[Resend] Team intake send error:", JSON.stringify(error));
      return { success: false, error: error.message };
    }
    console.log("[Resend] Team intake sent. id:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("[Resend] Team intake failed:", err);
    return { success: false, error: String(err) };
  }
}
