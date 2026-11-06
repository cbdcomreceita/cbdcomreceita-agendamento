import { describe, expect, it } from "vitest";
import { buildIntakeReminderTemplateParams, type IntakeReminderTemplateInput } from "./intake-reminder-template";

const input: IntakeReminderTemplateInput = {
  patientFullName: "Maria Silva Santos",
  doctorName: "Dra. Ana Costa",
  dateLabel: "amanhã, 05/11",
  timeH: "14h30",
  intakeDeadline: "05/11 às 12h30",
  intakeToken: "tok123",
};

describe("buildIntakeReminderTemplateParams", () => {
  it("maps the five variables to {{1}}..{{5}} in order", () => {
    const params = buildIntakeReminderTemplateParams(input);
    expect(params.processed_params.body).toEqual({
      "1": "Maria",
      "2": "Dra. Ana Costa",
      "3": "amanhã, 05/11",
      "4": "14h30",
      "5": "05/11 às 12h30",
    });
  });

  it("sets the single button's parameter to the raw intake token", () => {
    const params = buildIntakeReminderTemplateParams(input);
    expect(params.processed_params.buttons).toEqual([{ type: "url", parameter: "tok123" }]);
  });
});
