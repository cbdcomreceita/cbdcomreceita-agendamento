import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContent, buildIntakeLink, buildTemplateParams, firstName, type TemplateInput } from "./template";

afterEach(() => {
  vi.unstubAllEnvs();
});

const input: TemplateInput = {
  patientFullName: "Maria Silva Santos",
  dateBR: "12/09/2026",
  timeH: "14h30",
  doctorName: "Dra. Ana Costa",
  meetLink: "https://meet.google.com/abc-defg-hij",
  meetCode: "abc-defg-hij",
};

describe("firstName", () => {
  it("returns only the first word", () => {
    expect(firstName("Maria Silva Santos")).toBe("Maria");
  });

  it("handles a single-word name", () => {
    expect(firstName("Maria")).toBe("Maria");
  });

  it("collapses extra whitespace", () => {
    expect(firstName("  Maria   Silva  ")).toBe("Maria");
  });
});

describe("buildTemplateParams", () => {
  it("maps the five variables to {{1}}..{{5}} in order", () => {
    const params = buildTemplateParams(input);
    expect(params.name).toBe("confirmacao_consulta");
    expect(params.category).toBe("UTILITY");
    expect(params.language).toBe("pt_BR");
    expect(params.processed_params.body).toEqual({
      "1": "Maria",
      "2": "12/09/2026",
      "3": "14h30",
      "4": "Dra. Ana Costa",
      "5": "https://meet.google.com/abc-defg-hij",
    });
  });

  it("sets the button parameter to just the Meet code, not the full link", () => {
    const params = buildTemplateParams(input);
    expect(params.processed_params.buttons).toEqual([{ type: "url", parameter: "abc-defg-hij" }]);
  });

  it("adds a second url button with the intake link when intakeLink is set", () => {
    const params = buildTemplateParams({
      ...input,
      intakeLink: "https://www.cbdcomreceita.com.br/prontuario/tok123",
    });
    expect(params.processed_params.buttons).toEqual([
      { type: "url", parameter: "abc-defg-hij" },
      { type: "url", parameter: "https://www.cbdcomreceita.com.br/prontuario/tok123" },
    ]);
  });

  it("omits the second button when intakeLink is absent", () => {
    const params = buildTemplateParams(input);
    expect(params.processed_params.buttons).toHaveLength(1);
  });
});

describe("buildIntakeLink", () => {
  it("builds the /prontuario/[token] URL from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example.com");
    expect(buildIntakeLink("tok123")).toBe("https://preview.example.com/prontuario/tok123");
  });

  it("falls back to the production domain when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(buildIntakeLink("tok123")).toBe("https://www.cbdcomreceita.com.br/prontuario/tok123");
  });
});

describe("buildContent", () => {
  it("renders the patient's first name, date, time, doctor, and full Meet link", () => {
    const content = buildContent(input);
    expect(content).toContain("Maria");
    expect(content).toContain("12/09/2026");
    expect(content).toContain("14h30");
    expect(content).toContain("Dra. Ana Costa");
    expect(content).toContain("https://meet.google.com/abc-defg-hij");
  });
});
