import { z } from "zod";
import { SERVICE_BY_CODE, isEmirate, JURISDICTION_BY_CODE, INDUSTRY_BY_CODE, LANGUAGE_BY_CODE } from "./taxonomy";

/**
 * Adaptive needs assessment. Questions are data; `when` decides whether a question
 * applies given earlier answers. The same definition drives the UI and server validation,
 * so a hand-crafted POST cannot skip a required conditional question.
 */

export type Answers = Record<string, string | string[] | undefined>;

export type Option = { value: string; label: string };
export type Question = {
  id: string;
  step: "needs" | "business" | "details" | "preferences";
  label: string;
  help?: string;
  kind: "single" | "multi";
  options: Option[];
  required: boolean;
  when?: (a: Answers) => boolean;
};

const has = (a: Answers, service: string) => Array.isArray(a.services) && a.services.includes(service);
const hasCategory = (a: Answers, cat: string) =>
  Array.isArray(a.services) && a.services.some((s) => SERVICE_BY_CODE[s]?.category === cat);

const yesNoUnsure: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

export const QUESTIONS: Question[] = [
  {
    id: "companyStage",
    step: "business",
    label: "Where is the business today?",
    kind: "single",
    required: true,
    options: [
      { value: "pre-incorporation", label: "Not yet set up" },
      { value: "new", label: "Operating for less than a year" },
      { value: "established", label: "Operating for one year or more" },
    ],
  },
  {
    id: "revenueBand",
    step: "business",
    label: "Approximate annual revenue (AED)",
    help: "A range is enough. This helps providers judge fit; it is not used to work out any tax position.",
    kind: "single",
    required: true,
    options: [
      { value: "lt-1m", label: "Under 1 million" },
      { value: "1m-10m", label: "1 to 10 million" },
      { value: "10m-50m", label: "10 to 50 million" },
      { value: "50m-250m", label: "50 to 250 million" },
      { value: "gt-250m", label: "Over 250 million" },
      { value: "unknown", label: "Prefer not to say" },
    ],
  },
  {
    id: "employeesBand",
    step: "business",
    label: "Number of employees",
    kind: "single",
    required: true,
    options: [
      { value: "1-9", label: "1–9" },
      { value: "10-49", label: "10–49" },
      { value: "50-249", label: "50–249" },
      { value: "250+", label: "250 or more" },
    ],
  },
  {
    id: "groupStructure",
    step: "details",
    label: "Is the business part of a group?",
    kind: "single",
    required: true,
    when: (a) => hasCategory(a, "corporate_tax"),
    options: [
      { value: "single", label: "No, a single company" },
      { value: "group-uae", label: "Yes, a group within the UAE" },
      { value: "group-international", label: "Yes, with companies outside the UAE" },
    ],
  },
  {
    id: "ctRegistered",
    step: "details",
    label: "Is the business already registered for Corporate Tax?",
    kind: "single",
    required: true,
    when: (a) => hasCategory(a, "corporate_tax"),
    options: yesNoUnsure,
  },
  {
    id: "relatedPartyTransactions",
    step: "details",
    label: "Does the business transact with related parties?",
    kind: "single",
    required: true,
    when: (a) => has(a, "transfer-pricing"),
    options: yesNoUnsure,
  },
  {
    id: "vatRegistered",
    step: "details",
    label: "Is the business registered for VAT?",
    kind: "single",
    required: true,
    when: (a) => hasCategory(a, "vat"),
    options: yesNoUnsure,
  },
  {
    id: "ftaMatter",
    step: "details",
    label: "What do you need a tax agent for?",
    kind: "single",
    required: true,
    when: (a) => has(a, "fta-representation"),
    options: [
      { value: "audit", label: "An FTA audit or information request" },
      { value: "disclosure", label: "Correcting a past return" },
      { value: "reconsideration", label: "Challenging an FTA decision or penalty" },
      { value: "ongoing", label: "Ongoing appointment as our tax agent" },
    ],
  },
  {
    id: "erpSystem",
    step: "details",
    label: "Which accounting or ERP system do you use?",
    kind: "single",
    required: true,
    when: (a) => hasCategory(a, "einvoicing"),
    options: [
      { value: "sap", label: "SAP" },
      { value: "oracle", label: "Oracle" },
      { value: "microsoft", label: "Microsoft Dynamics" },
      { value: "odoo", label: "Odoo" },
      { value: "zoho", label: "Zoho Books" },
      { value: "tally", label: "Tally" },
      { value: "quickbooks", label: "QuickBooks / Xero" },
      { value: "other", label: "Other" },
      { value: "none", label: "Spreadsheets / none" },
    ],
  },
  {
    id: "invoiceVolume",
    step: "details",
    label: "Invoices issued per month",
    kind: "single",
    required: true,
    when: (a) => hasCategory(a, "einvoicing"),
    options: [
      { value: "lt-100", label: "Fewer than 100" },
      { value: "100-1000", label: "100 to 1,000" },
      { value: "1000-10000", label: "1,000 to 10,000" },
      { value: "gt-10000", label: "More than 10,000" },
    ],
  },
  {
    id: "urgency",
    step: "preferences",
    label: "When do you need help?",
    kind: "single",
    required: true,
    options: [
      { value: "this-week", label: "This week" },
      { value: "this-month", label: "This month" },
      { value: "this-quarter", label: "In the next three months" },
      { value: "exploring", label: "Just exploring" },
    ],
  },
  {
    id: "budgetBand",
    step: "preferences",
    label: "Budget for this work (AED)",
    kind: "single",
    required: false,
    options: [
      { value: "lt-5k", label: "Under 5,000" },
      { value: "5k-20k", label: "5,000 to 20,000" },
      { value: "20k-100k", label: "20,000 to 100,000" },
      { value: "gt-100k", label: "Over 100,000" },
      { value: "unknown", label: "Not sure yet" },
    ],
  },
];

export const applicableQuestions = (a: Answers): Question[] => QUESTIONS.filter((q) => !q.when || q.when(a));

const code = (dict: Record<string, unknown>, what: string) =>
  z.string().refine((v) => Object.hasOwn(dict, v), { message: `Unknown ${what}` });

/** Base fields always present. */
export const baseAssessmentSchema = z.object({
  services: z.array(code(SERVICE_BY_CODE, "service")).min(1, "Choose at least one service").max(8),
  emirate: z.string().refine(isEmirate, { message: "Choose an emirate" }),
  jurisdiction: code(JURISDICTION_BY_CODE, "jurisdiction").optional(),
  industry: code(INDUSTRY_BY_CODE, "industry").optional(),
  languages: z.array(code(LANGUAGE_BY_CODE, "language")).max(5).default([]),
});

export type Assessment = z.infer<typeof baseAssessmentSchema> & { answers: Record<string, string> };

export type ValidationResult = { ok: true; value: Assessment } | { ok: false; errors: Record<string, string> };

/** Validates the full assessment, including adaptive questions, and drops answers to questions that do not apply. */
export function validateAssessment(input: Answers): ValidationResult {
  const errors: Record<string, string> = {};
  const base = baseAssessmentSchema.safeParse({
    services: arr(input.services),
    emirate: input.emirate,
    jurisdiction: input.jurisdiction || undefined,
    industry: input.industry || undefined,
    languages: arr(input.languages),
  });
  if (!base.success) {
    for (const issue of base.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  }
  if (base.success && base.data.jurisdiction) {
    const j = JURISDICTION_BY_CODE[base.data.jurisdiction];
    if (j && j.emirate !== base.data.emirate) errors.jurisdiction = "That zone is not in the selected emirate";
  }
  const answers: Record<string, string> = {};
  for (const q of applicableQuestions(input)) {
    const v = input[q.id];
    const value = Array.isArray(v) ? v[0] : v;
    if (!value) {
      if (q.required) errors[q.id] = "Please answer this question";
      continue;
    }
    if (!q.options.some((o) => o.value === value)) {
      errors[q.id] = "Invalid answer";
      continue;
    }
    answers[q.id] = value;
  }
  if (Object.keys(errors).length || !base.success) return { ok: false, errors };
  return { ok: true, value: { ...base.data, answers } };
}

function arr(v: string | string[] | undefined): string[] {
  if (v === undefined || v === "") return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
}

export function answerLabel(questionId: string, value: string): string {
  const q = QUESTIONS.find((x) => x.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}
