import { z } from "zod";
import { SERVICE_BY_CODE, isEmirate, JURISDICTION_BY_CODE, INDUSTRY_BY_CODE, LANGUAGE_BY_CODE } from "./taxonomy";
import { QUESTIONS, applicableQuestions, type Answers } from "./questions";

export * from "./questions";

/** Server-side validation of the adaptive assessment defined in ./questions. */

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
