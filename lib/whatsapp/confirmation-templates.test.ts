import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTemplateParams, type TemplateInput } from "./template";
import { buildConfirmationV2TemplateParams, type ConfirmationV2TemplateInput } from "./confirmation-v2-template";

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * Item 2 do pedido: "escolha o template pelo booking" — mostra os
 * parâmetros gerados nos dois casos (intake_required=false usa o template
 * atual sem mudança; intake_required=true usa o v2, com 6 variáveis e 2
 * botões na ordem prontuário-depois-Meet).
 */
describe("confirmation template selection — intake_required=false vs true", () => {
  it("intake_required=false: confirmacao_consulta, 5 body vars, 1 button (Meet code)", () => {
    const input: TemplateInput = {
      patientFullName: "Maria Silva Santos",
      dateBR: "12/09/2026",
      timeH: "14h30",
      doctorName: "Dra. Ana Costa",
      meetLink: "https://meet.google.com/abc-defg-hij",
      meetCode: "abc-defg-hij",
    };
    const params = buildTemplateParams(input);
    expect(params.name).toBe("confirmacao_consulta");
    expect(params.processed_params.body).toEqual({
      "1": "Maria",
      "2": "12/09/2026",
      "3": "14h30",
      "4": "Dra. Ana Costa",
      "5": "https://meet.google.com/abc-defg-hij",
    });
    expect(params.processed_params.buttons).toEqual([{ type: "url", parameter: "abc-defg-hij" }]);
  });

  it("intake_required=true: confirmacao_consulta_v2, 6 body vars, buttons [prontuário, Meet]", () => {
    vi.stubEnv("WHATSAPP_CONFIRMATION_TEMPLATE_NAME", "confirmacao_consulta_v2");
    const input: ConfirmationV2TemplateInput = {
      patientFullName: "Maria Silva Santos",
      weekdayDateShort: "quarta-feira, 05/11",
      timeH: "19h30",
      doctorName: "Dra. Ana Costa",
      intakeDeadline: "05/11 às 17h30",
      meetLink: "https://meet.google.com/abc-defg-hij",
      intakeToken: "tok123",
      meetCode: "abc-defg-hij",
    };
    const params = buildConfirmationV2TemplateParams(input);
    expect(params.name).toBe("confirmacao_consulta_v2");
    expect(params.processed_params.body).toEqual({
      "1": "Maria",
      "2": "quarta-feira, 05/11",
      "3": "19h30",
      "4": "Dra. Ana Costa",
      "5": "05/11 às 17h30",
      "6": "https://meet.google.com/abc-defg-hij",
    });
    expect(params.processed_params.buttons).toEqual([
      { type: "url", parameter: "tok123" },
      { type: "url", parameter: "abc-defg-hij" },
    ]);
  });
});
