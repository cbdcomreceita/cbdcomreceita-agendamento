import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/audit/log-error", () => ({ logError: vi.fn() }));

const AUTISM_DOCTOR_ID = "7b74694a-b8f5-462a-9da2-75ce207ea786"; // real Dra. Carolina Lopes id

function doctor(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    name: "Dra. Teste",
    crm: "12345",
    crm_uf: "SP",
    specialties: [],
    bio_short: null,
    photo_url: null,
    email: "doc@example.com",
    calcom_event_type_slug: "slug",
    calcom_event_type_id: 111,
    global_priority: 1,
    handles_minors: true,
    handles_elderly: true,
    is_active: true,
    medical_specialty: "Clínica Geral",
    ...overrides,
  };
}

let symptomMapRows: unknown[] = [];
let symptomMapError: unknown = null;
const getActiveDoctorsMock = vi.fn();
vi.mock("@/app/actions/get-doctors", () => ({
  getActiveDoctors: (...a: unknown[]) => getActiveDoctorsMock(...a),
}));

function makeSupabaseMock() {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(async () => ({ data: symptomMapRows, error: symptomMapError })),
  };
  return { from: vi.fn(() => chain) };
}
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => makeSupabaseMock(),
}));

const getAvailableSlotsMock = vi.fn();
vi.mock("@/lib/calcom/availability", () => ({
  getAvailableSlots: (...a: unknown[]) => getAvailableSlotsMock(...a),
}));

const { getNextAgendaBlocks } = await import("./get-next-agenda-blocks");

beforeEach(() => {
  symptomMapRows = [];
  symptomMapError = null;
  getActiveDoctorsMock.mockReset();
  getAvailableSlotsMock.mockReset();
});

describe("getNextAgendaBlocks", () => {
  it("returns empty when there are no active-doctor candidates at all", async () => {
    getActiveDoctorsMock.mockResolvedValue([]);
    const result = await getNextAgendaBlocks([], [], false);
    expect(result).toEqual({ blocks: [], usedFallback: false });
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it("falls back to every active doctor when no symptom_doctor_map row matches", async () => {
    getActiveDoctorsMock.mockResolvedValue([doctor()]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] }, // 08:00 BRT -> manha
    ]);
    const result = await getNextAgendaBlocks([], ["sintoma-sem-mapa"], false);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].doctor.id).toBe("doc-1");
  });

  it("uses only symptom-matched doctors when symptom_doctor_map has rows", async () => {
    symptomMapRows = [
      { priority: 1, symptoms: { slug: "ansiedade" }, doctors: doctor({ id: "doc-matched" }) },
    ];
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] },
    ]);
    const result = await getNextAgendaBlocks([], ["ansiedade"], false);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].doctor.id).toBe("doc-matched");
    expect(getActiveDoctorsMock).not.toHaveBeenCalled();
  });

  it("excludes the autism-excluded doctor when 'autismo' is among the symptoms", async () => {
    getActiveDoctorsMock.mockResolvedValue([
      doctor({ id: AUTISM_DOCTOR_ID, name: "Dra. Carolina Lopes" }),
      doctor({ id: "doc-other" }),
    ]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] },
    ]);
    const result = await getNextAgendaBlocks([], ["autismo"], false);
    expect(result.blocks.every((b) => b.doctor.id !== AUTISM_DOCTOR_ID)).toBe(true);
    expect(result.blocks.some((b) => b.doctor.id === "doc-other")).toBe(true);
  });

  it("excludes doctors that don't handle minors when isMinor is true", async () => {
    getActiveDoctorsMock.mockResolvedValue([
      doctor({ id: "doc-no-minors", handles_minors: false }),
      doctor({ id: "doc-handles-minors", handles_minors: true }),
    ]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] },
    ]);
    const result = await getNextAgendaBlocks([], [], true);
    expect(result.blocks.every((b) => b.doctor.id !== "doc-no-minors")).toBe(true);
  });

  it("groups slots from the same doctor/day/period into a single block", async () => {
    getActiveDoctorsMock.mockResolvedValue([doctor()]);
    getAvailableSlotsMock.mockResolvedValue([
      {
        date: "2026-11-09",
        slots: [
          { time: "2026-11-09T11:00:00.000Z" }, // 08:00 BRT -> manha
          { time: "2026-11-09T11:30:00.000Z" }, // 08:30 BRT -> manha
          { time: "2026-11-09T20:00:00.000Z" }, // 17:00 BRT -> tarde
        ],
      },
    ]);
    const result = await getNextAgendaBlocks([], [], false);
    expect(result.blocks).toHaveLength(2);
    const manha = result.blocks.find((b) => b.period === "manha")!;
    expect(manha.slots).toHaveLength(2);
    const tarde = result.blocks.find((b) => b.period === "tarde")!;
    expect(tarde.slots).toHaveLength(1);
  });

  it("filters to the triage's chosen (weekday, period) pairs when at least one block matches", async () => {
    getActiveDoctorsMock.mockResolvedValue([doctor()]);
    // 2026-11-09 is a Monday (weekday 1).
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] }, // Mon manha
      { date: "2026-11-09", slots: [{ time: "2026-11-09T20:00:00.000Z" }] }, // Mon tarde
    ]);
    const result = await getNextAgendaBlocks([{ weekday: 1, period: "manha" }], [], false);
    expect(result.usedFallback).toBe(false);
    expect(result.blocks.every((b) => b.period === "manha")).toBe(true);
  });

  it("falls back to the nearest blocks in any period when none match the chosen periods", async () => {
    getActiveDoctorsMock.mockResolvedValue([doctor()]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T20:00:00.000Z" }] }, // Mon tarde only
    ]);
    const result = await getNextAgendaBlocks([{ weekday: 1, period: "noite" }], [], false);
    expect(result.usedFallback).toBe(true);
    expect(result.blocks).toHaveLength(1);
  });

  it("item 2b: two doctors free on the same day+period appear as separate blocks, tie broken by global_priority", async () => {
    getActiveDoctorsMock.mockResolvedValue([
      doctor({ id: "doc-low-priority", global_priority: 5 }),
      doctor({ id: "doc-high-priority", global_priority: 1 }),
    ]);
    // Same mocked return for every eventTypeId — both doctors free at the exact same day/period.
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] },
    ]);
    const result = await getNextAgendaBlocks([], [], false);
    expect(result.blocks).toHaveLength(2);
    // Lower global_priority sorts first when blockStart ties.
    expect(result.blocks[0].doctor.id).toBe("doc-high-priority");
    expect(result.blocks[1].doctor.id).toBe("doc-low-priority");
  });

  it("item 0: a Friday-night BRT slot that crosses midnight UTC is still classified as Friday/noite", async () => {
    // getAvailableSlots (now fixed to pass timeZone=America/Sao_Paulo) buckets
    // this day under "2026-11-13" (Friday BRT) even though the slot's own
    // ISO instant (21h BRT) is already "2026-11-14" in UTC.
    getActiveDoctorsMock.mockResolvedValue([doctor({ id: "doc-brendon" })]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-13", slots: [{ time: "2026-11-14T00:00:00.000Z" }] }, // Fri 21h BRT
    ]);
    const result = await getNextAgendaBlocks([{ weekday: 5, period: "noite" }], [], false);
    expect(result.usedFallback).toBe(false);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].period).toBe("noite");
    expect(result.blocks[0].date).toBe("2026-11-13");
  });

  it("item 0: Dr. Brendon (sexta à noite) and Dra. Carolina (sexta de manhã) both appear when both days/periods are chosen", async () => {
    getActiveDoctorsMock.mockResolvedValue([
      doctor({ id: "doc-brendon", name: "Dr. Brendon", global_priority: 3, calcom_event_type_id: 6217774 }),
      doctor({ id: AUTISM_DOCTOR_ID, name: "Dra. Carolina Lopes", global_priority: 1 }),
    ]);
    getAvailableSlotsMock.mockImplementation(async (eventTypeId: number) => {
      if (eventTypeId === 6217774) {
        // Dr. Brendon — Friday 20h BRT, which is already Saturday 23h UTC.
        return [{ date: "2026-11-13", slots: [{ time: "2026-11-13T23:00:00.000Z" }] }];
      }
      return [{ date: "2026-11-13", slots: [{ time: "2026-11-13T12:00:00.000Z" }] }]; // Fri 09h BRT
    });
    const result = await getNextAgendaBlocks(
      [
        { weekday: 5, period: "manha" },
        { weekday: 5, period: "noite" },
      ],
      [],
      false
    );
    expect(result.usedFallback).toBe(false);
    expect(result.blocks).toHaveLength(2);
    const brendonBlock = result.blocks.find((b) => b.doctor.id === "doc-brendon");
    const carolinaBlock = result.blocks.find((b) => b.doctor.id === AUTISM_DOCTOR_ID);
    expect(brendonBlock?.period).toBe("noite");
    expect(carolinaBlock?.period).toBe("manha");
  });

  it("caps the result at 3 blocks, nearest first", async () => {
    getActiveDoctorsMock.mockResolvedValue([doctor()]);
    getAvailableSlotsMock.mockResolvedValue([
      { date: "2026-11-09", slots: [{ time: "2026-11-09T11:00:00.000Z" }] },
      { date: "2026-11-10", slots: [{ time: "2026-11-10T11:00:00.000Z" }] },
      { date: "2026-11-11", slots: [{ time: "2026-11-11T11:00:00.000Z" }] },
      { date: "2026-11-12", slots: [{ time: "2026-11-12T11:00:00.000Z" }] },
    ]);
    const result = await getNextAgendaBlocks([], [], false);
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0].date).toBe("2026-11-09");
    expect(result.blocks[2].date).toBe("2026-11-11");
  });
});
