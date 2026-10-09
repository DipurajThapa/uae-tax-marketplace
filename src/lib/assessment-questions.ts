import { SERVICE_BY_CODE } from "./taxonomy";

/**
 * Adaptive needs assessment. Questions are data; `when` decides whether a question
 * applies given earlier answers. The same definition drives the UI and server validation
 * (`./assessment`), so a hand-crafted POST cannot skip a required conditional question.
 * No zod here: this file ships to the browser in the /match wizard.
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

export function answerLabel(questionId: string, value: string): string {
  const q = QUESTIONS.find((x) => x.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}
