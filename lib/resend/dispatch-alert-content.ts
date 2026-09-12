export type DispatchStep = "doctor_email" | "team_email" | "sheets";

export interface DispatchFailure {
  step: DispatchStep;
  /** Technical error message for the "Detalhes técnicos" section. NEVER health data. */
  detail: string;
}

export interface ComposeDispatchAlertInput {
  bookingId: string;
  patientName: string;
  doctorName: string;
  dateBR: string;
  timeH: string;
  failures: DispatchFailure[];
}

/**
 * "Dr."/"Dra." is the only gender signal we have on doctors.name (no
 * dedicated column). When it's not clearly one or the other, we fall back
 * to "médico responsável" everywhere rather than guessing wrong.
 */
export function inferDoctorWording(doctorName: string): { noun: string; contr: string } {
  const trimmed = doctorName.trim();
  if (/^dra\.?\s/i.test(trimmed)) return { noun: "médica", contr: "à" };
  if (/^dr\.?\s/i.test(trimmed)) return { noun: "médico", contr: "ao" };
  return { noun: "médico responsável", contr: "ao" };
}

/**
 * Builds the subject/body for the team-facing dispatch-failure alert.
 * NEVER include symptoms, condition, or any other health data — only
 * booking logistics. Groups every failed step from a single run into one
 * message — never one per step.
 */
export function composeDispatchAlert(
  input: ComposeDispatchAlertInput
): { subject: string; body: string } {
  const { bookingId, patientName, doctorName, dateBR, timeH, failures } = input;

  const doctorEmailFailed = failures.some((f) => f.step === "doctor_email");
  const { noun, contr } = inferDoctorWording(doctorName);

  const stepLabel: Record<DispatchStep, string> = {
    doctor_email: `Aviso ${contr} ${noun}`,
    team_email: "E-mail para a equipe",
    sheets: "Planilha de acompanhamento",
  };

  const bodyLines: string[] = [];
  if (doctorEmailFailed) {
    bodyLines.push(
      `ATENÇÃO: o aviso da consulta não chegou ${contr} ${noun}. Avise manualmente o quanto antes.`,
      "",
      "Etapas que falharam:",
      `- Aviso ${contr} ${noun} (avisar manualmente)`
    );
    if (failures.some((f) => f.step === "team_email")) {
      bodyLines.push("- E-mail para a equipe (se também falhou)");
    }
    if (failures.some((f) => f.step === "sheets")) {
      bodyLines.push("- Planilha de acompanhamento (conferir e lançar à mão, se também falhou)");
    }
  } else {
    bodyLines.push(
      `Uma ou mais etapas pós-pagamento falharam para esta consulta. O aviso ${contr} ${noun} foi enviado normalmente.`,
      "",
      "Etapas que falharam:"
    );
    if (failures.some((f) => f.step === "team_email")) {
      bodyLines.push("- E-mail para a equipe");
    }
    if (failures.some((f) => f.step === "sheets")) {
      bodyLines.push("- Planilha de acompanhamento (conferir e lançar à mão)");
    }
  }

  bodyLines.push(
    "",
    `Paciente: ${patientName}`,
    `Médico(a): ${doctorName}`,
    `Data: ${dateBR}`,
    `Horário: ${timeH}`,
    `Booking ID: ${bookingId}`,
    "",
    "Detalhes técnicos:",
    ...failures.map((f) => `- ${stepLabel[f.step]}: ${f.detail}`)
  );

  const subject = doctorEmailFailed
    ? `[URGENTE] O aviso da consulta não chegou ${contr} ${noun} — ${patientName}`
    : `[Aviso] Falha ao registrar consulta — ${patientName}`;

  return { subject, body: bodyLines.join("\n") };
}
