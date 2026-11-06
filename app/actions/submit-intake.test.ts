import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const tryCheckRateLimit = vi.fn(async (..._args: unknown[]) => ({ ok: true }) as { ok: boolean; limit?: number; remaining?: number; reset?: number });
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { intake: {} },
  tryCheckRateLimit: (...a: unknown[]) => tryCheckRateLimit(...a),
  getClientIp: () => "1.2.3.4",
  maskIp: (ip: string) => ip,
}));

const sendDoctorIntake = vi.fn(async (..._args: unknown[]) => ({ success: true }));
const sendTeamIntake = vi.fn(async (..._args: unknown[]) => ({ success: true }));
vi.mock("@/lib/resend/send-intake", () => ({
  sendDoctorIntake: (...a: unknown[]) => sendDoctorIntake(...a),
  sendTeamIntake: (...a: unknown[]) => sendTeamIntake(...a),
}));

const updateGoogleSheetRow = vi.fn(async (..._args: unknown[]) => ({ success: true }));
vi.mock("@/lib/google-sheets/update-row", () => ({
  updateGoogleSheetRow: (...a: unknown[]) => updateGoogleSheetRow(...a),
}));

const VALID_DATA = {
  patientFullName: "Lais Teste Filho",
  patientCpf: "411.452.858-05",
  rg: "123456789",
  birthDate: "1990-01-01",
  cep: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP" as const,
};

function bookingRow(overrides: Record<string, unknown> = {}) {
  const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: "booking-1",
    patient_id: "patient-1",
    scheduled_at: FUTURE,
    scheduled_end_at: null,
    meet_link: "https://meet.google.com/abc-defg-hij",
    intake_required: true,
    intake_completed_at: null,
    triage_data: { duration: "less_1m", priorTreatment: null, isMinor: false },
    // `patients` is the booking's CONTACT/RESPONSÁVEL — deliberately a
    // different person from VALID_DATA.patientFullName/patientCpf, to
    // prove submitIntake never writes patient-identity fields here.
    patients: {
      id: "patient-1",
      full_name: "Lais Teste",
      email: "laishara011@gmail.com",
      phone: "+5511945916893",
      cpf: "41145285805",
      selected_symptoms: ["ansiedade"],
      has_current_medication: false,
      current_medications: null,
      prior_cbd_use: "never",
      lgpd_consent_at: new Date().toISOString(),
      terms_consent_at: new Date().toISOString(),
    },
    doctors: { name: "Dra. Carolina Lopes", email: "carolina@example.com", crm: "12345", crm_uf: "SP" },
    payments: [{ amount_cents: 4990, status: "approved", paid_at: new Date().toISOString(), coupon_code: null }],
    ...overrides,
  };
}

type Spy = (...args: unknown[]) => void;
let currentRow: unknown;
let bookingUpdateSpy: Spy;
let patientsTableTouched: boolean;
let auditInsertSpy: Spy;

function makeSupabaseMock(row: unknown) {
  const bookingsChain = {
    select: vi.fn(() => bookingsChain),
    eq: vi.fn(() => bookingsChain),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    update: vi.fn((...a: unknown[]) => {
      bookingUpdateSpy(...a);
      return bookingsChain;
    }),
  };
  const auditChain = {
    insert: vi.fn(async (...a: unknown[]) => {
      auditInsertSpy(...a);
      return { data: null, error: null };
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "bookings") return bookingsChain;
      if (table === "patients") {
        patientsTableTouched = true;
        throw new Error("submitIntake must never write to the shared patients row");
      }
      if (table === "audit_events") return auditChain;
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(currentRow),
}));

const { submitIntake } = await import("./submit-intake");

beforeEach(() => {
  sendDoctorIntake.mockClear();
  sendTeamIntake.mockClear();
  updateGoogleSheetRow.mockClear();
  tryCheckRateLimit.mockClear();
  tryCheckRateLimit.mockResolvedValue({ ok: true });
  bookingUpdateSpy = vi.fn();
  patientsTableTouched = false;
  auditInsertSpy = vi.fn();
});

describe("submitIntake", () => {
  it("saves the patient's own identity on the booking (never on the shared patients row), marks intake_completed_at, audits, and notifies doctor+team+sheets", async () => {
    currentRow = bookingRow();
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });

    expect(result.success).toBe(true);
    expect(patientsTableTouched).toBe(false);
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_full_name: "Lais Teste Filho",
        patient_cpf: "41145285805",
        patient_rg: "123456789",
        patient_address_city: "São Paulo",
      })
    );
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ intake_completed_at: expect.any(String) })
    );
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "intake_completed" })
    );
    expect(sendDoctorIntake).toHaveBeenCalledWith(
      expect.objectContaining({ intakePending: false, patientName: "Lais Teste Filho" })
    );
    expect(sendTeamIntake).toHaveBeenCalledTimes(1);
    expect(updateGoogleSheetRow).toHaveBeenCalledWith(
      "booking-1",
      expect.objectContaining({ RG: "123456789", Paciente: "Lais Teste Filho" })
    );
    // "Nome"/"CPF" (contato) are never part of the intake-time Sheets update.
    expect(updateGoogleSheetRow).toHaveBeenCalledWith(
      "booking-1",
      expect.not.objectContaining({ Nome: expect.anything(), CPF: expect.anything() })
    );
  });

  it("accepts a missing patientCpf when the booking's triage marks the patient as a minor", async () => {
    currentRow = bookingRow({ triage_data: { isMinor: true } });
    const { patientCpf, ...withoutCpf } = VALID_DATA;
    void patientCpf;
    const result = await submitIntake({ token: "tok123", data: withoutCpf as typeof VALID_DATA });

    expect(result.success).toBe(true);
  });

  it("rejects a missing patientCpf when the patient is an adult", async () => {
    currentRow = bookingRow(); // isMinor: false
    const { patientCpf, ...withoutCpf } = VALID_DATA;
    void patientCpf;
    const result = await submitIntake({ token: "tok123", data: withoutCpf as typeof VALID_DATA });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.patientCpf).toBeTruthy();
  });

  it("is idempotent when intake is already completed", async () => {
    currentRow = bookingRow({ intake_completed_at: new Date().toISOString() });
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });

    expect(result.success).toBe(true);
    expect(sendDoctorIntake).not.toHaveBeenCalled();
    expect(bookingUpdateSpy).not.toHaveBeenCalled();
  });

  it("rejects once the consultation's end time has passed", async () => {
    const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    currentRow = bookingRow({ scheduled_at: PAST });
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });

    expect(result.success).toBe(false);
    expect(sendDoctorIntake).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid data without touching the database", async () => {
    currentRow = bookingRow();
    const result = await submitIntake({ token: "tok123", data: { ...VALID_DATA, rg: "1" } });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.rg).toBeTruthy();
    expect(bookingUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns an error when no booking matches the token", async () => {
    currentRow = null;
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });
    expect(result.success).toBe(false);
  });
});
