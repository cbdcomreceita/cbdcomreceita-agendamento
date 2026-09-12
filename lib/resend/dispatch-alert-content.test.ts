import { describe, expect, it } from "vitest";
import { composeDispatchAlert, inferDoctorWording } from "./dispatch-alert-content";

describe("inferDoctorWording", () => {
  it("infers feminine from the 'Dra.' prefix", () => {
    expect(inferDoctorWording("Dra. Carolina Lopes")).toEqual({ noun: "médica", contr: "à" });
  });

  it("infers masculine from the 'Dr.' prefix", () => {
    expect(inferDoctorWording("Dr. Magno Cruz")).toEqual({ noun: "médico", contr: "ao" });
  });

  it("falls back to 'médico responsável' when the prefix is missing", () => {
    expect(inferDoctorWording("Equipe Substituta")).toEqual({
      noun: "médico responsável",
      contr: "ao",
    });
  });
});

describe("composeDispatchAlert", () => {
  it("marks the subject and body as URGENTE when the doctor e-mail failed, using feminine wording", () => {
    const { subject, body } = composeDispatchAlert({
      bookingId: "b1",
      patientName: "Maria Teste",
      doctorName: "Dra. Carolina Lopes",
      dateBR: "21/09/2026",
      timeH: "10h30",
      failures: [{ step: "doctor_email", detail: "Resend error: domain not verified" }],
    });

    expect(subject).toContain("[URGENTE]");
    expect(subject).toContain("à médica");
    expect(body).toContain("ATENÇÃO: o aviso da consulta não chegou à médica.");
    expect(body).toContain("- Aviso à médica (avisar manualmente)");
    // Only the doctor step failed — no conditional bullets for the others.
    expect(body).not.toContain("E-mail para a equipe");
    expect(body).not.toContain("Planilha de acompanhamento");
  });

  it("lists all three failed steps when everything fails, using masculine wording", () => {
    const { subject, body } = composeDispatchAlert({
      bookingId: "b2",
      patientName: "João Teste",
      doctorName: "Dr. Magno Cruz",
      dateBR: "22/09/2026",
      timeH: "14h00",
      failures: [
        { step: "doctor_email", detail: "timeout" },
        { step: "team_email", detail: "timeout" },
        { step: "sheets", detail: "500: internal error" },
      ],
    });

    expect(subject).toContain("[URGENTE]");
    expect(body).toContain("- Aviso ao médico (avisar manualmente)");
    expect(body).toContain("- E-mail para a equipe (se também falhou)");
    expect(body).toContain("- Planilha de acompanhamento (conferir e lançar à mão, se também falhou)");
  });

  it("falls back to 'médico responsável' instead of guessing when the name has no Dr./Dra. prefix", () => {
    const { subject, body } = composeDispatchAlert({
      bookingId: "b3",
      patientName: "Ana Teste",
      doctorName: "Equipe Substituta",
      dateBR: "23/09/2026",
      timeH: "09h00",
      failures: [{ step: "doctor_email", detail: "invalid recipient" }],
    });

    expect(subject).toContain("médico responsável");
    expect(body).toContain("não chegou ao médico responsável");
  });

  it("uses the non-urgent [Aviso] subject and says the doctor was notified normally when only secondary steps fail", () => {
    const { subject, body } = composeDispatchAlert({
      bookingId: "b4",
      patientName: "Paulo Teste",
      doctorName: "Dra. Thiany Lange",
      dateBR: "24/09/2026",
      timeH: "16h00",
      failures: [{ step: "sheets", detail: "webhook 502" }],
    });

    expect(subject).toContain("[Aviso]");
    expect(subject).not.toContain("[URGENTE]");
    expect(body).toContain("O aviso à médica foi enviado normalmente.");
    expect(body).toContain("- Planilha de acompanhamento (conferir e lançar à mão)");
    expect(body).not.toContain("ATENÇÃO");
  });

  it("puts the technical detail of every failure under 'Detalhes técnicos', at the end", () => {
    const { body } = composeDispatchAlert({
      bookingId: "b5",
      patientName: "Rita Teste",
      doctorName: "Dr. Magno Cruz",
      dateBR: "25/09/2026",
      timeH: "11h00",
      failures: [
        { step: "team_email", detail: "SMTP 550" },
        { step: "sheets", detail: "webhook timeout" },
      ],
    });

    const detailsIndex = body.indexOf("Detalhes técnicos:");
    expect(detailsIndex).toBeGreaterThan(-1);
    expect(body.indexOf("SMTP 550")).toBeGreaterThan(detailsIndex);
    expect(body.indexOf("webhook timeout")).toBeGreaterThan(detailsIndex);
    // Booking data must appear before the technical details section.
    expect(body.indexOf("Booking ID: b5")).toBeLessThan(detailsIndex);
  });

  it("never includes health data (symptoms, medications, CPF, address)", () => {
    const { subject, body } = composeDispatchAlert({
      bookingId: "b6",
      patientName: "Carlos Teste",
      doctorName: "Dra. Carolina Lopes",
      dateBR: "26/09/2026",
      timeH: "08h00",
      failures: [{ step: "doctor_email", detail: "bounce" }],
    });

    const combined = `${subject}\n${body}`;
    for (const forbidden of ["CPF", "sintoma", "medicament", "endereço", "CBD"]) {
      expect(combined.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
