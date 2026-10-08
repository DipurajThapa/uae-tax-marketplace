import { describe, it, expect } from "vitest";
import { validateAssessment, applicableQuestions } from "@/lib/assessment";

const minimal = { services: ["vat-returns"], emirate: "dubai", companyStage: "established", revenueBand: "1m-10m", employeesBand: "10-49", urgency: "this-month", vatRegistered: "yes" };

describe("adaptive assessment", () => {
  it("asks e-invoicing questions only when an e-invoicing service is chosen", () => {
    expect(applicableQuestions({ services: ["vat-returns"] }).some((q) => q.id === "erpSystem")).toBe(false);
    expect(applicableQuestions({ services: ["einvoicing-readiness"] }).some((q) => q.id === "erpSystem")).toBe(true);
  });

  it("accepts a complete assessment", () => {
    const r = validateAssessment(minimal);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.answers.vatRegistered).toBe("yes");
  });

  it("rejects a skipped required conditional question (cannot be bypassed by a crafted POST)", () => {
    const r = validateAssessment({ ...minimal, services: ["vat-returns", "fta-representation"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.ftaMatter).toBeDefined();
  });

  it("drops answers to questions that do not apply", () => {
    const r = validateAssessment({ ...minimal, erpSystem: "sap" });
    expect(r.ok && "erpSystem" in r.value.answers).toBe(false);
  });

  it("rejects unknown services, emirates, options and mismatched zones", () => {
    expect(validateAssessment({ ...minimal, services: ["hack"] }).ok).toBe(false);
    expect(validateAssessment({ ...minimal, emirate: "atlantis" }).ok).toBe(false);
    expect(validateAssessment({ ...minimal, urgency: "yesterday" }).ok).toBe(false);
    const r = validateAssessment({ ...minimal, jurisdiction: "adgm" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.jurisdiction).toMatch(/not in the selected emirate/);
  });

  it("requires at least one service", () => {
    const r = validateAssessment({ ...minimal, services: [] });
    expect(r.ok).toBe(false);
  });
});
