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
    triage_data: { duration: "less_1m", priorTreatment: null },
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
let patientUpdateSpy: Spy;
let bookingUpdateSpy: Spy;
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
  const patientsChain = {
    update: vi.fn((...a: unknown[]) => {
      patientUpdateSpy(...a);
      return patientsChain;
    }),
    eq: vi.fn(async () => ({ error: null })),
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
      if (table === "patients") return patientsChain;
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
  patientUpdateSpy = vi.fn();
  bookingUpdateSpy = vi.fn();
  auditInsertSpy = vi.fn();
});

describe("submitIntake", () => {
  it("saves patient fields, marks intake_completed_at, audits, and notifies doctor+team+sheets", async () => {
    currentRow = bookingRow();
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });

    expect(result.success).toBe(true);
    expect(patientUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rg: "123456789", address_city: "São Paulo" })
    );
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ intake_completed_at: expect.any(String) })
    );
    expect(auditInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "intake_completed" })
    );
    expect(sendDoctorIntake).toHaveBeenCalledWith(expect.objectContaining({ intakePending: false }));
    expect(sendTeamIntake).toHaveBeenCalledTimes(1);
    expect(updateGoogleSheetRow).toHaveBeenCalledWith("booking-1", expect.objectContaining({ RG: "123456789" }));
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
    expect(patientUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns an error when no booking matches the token", async () => {
    currentRow = null;
    const result = await submitIntake({ token: "tok123", data: VALID_DATA });
    expect(result.success).toBe(false);
  });
});
