/** Forbidden public copy. Shared by the CI lint (scripts/lint-copy.ts) and runtime checks on provider-written text. */
export const FORBIDDEN_COPY: [RegExp, string][] = [
  [/recommended for you/i, "personalised recommendation"],
  [/best for you/i, "personalised recommendation"],
  [/\byou should\b/i, "advice wording"],
  [/\bguaranteed?\b/i, "guarantee"],
  [/\bsave (aed|\$|money|up to)/i, "savings promise"],
  [/\bofficial(ly)? (partner|approved|endorsed|verified)\b/i, "implied endorsement"],
  [/\b(fta|ministry of finance|mof)[- ]?(approved|endorsed|certified|verified)\b/i, "implied endorsement"],
  [/\b(approved|endorsed|certified|verified) by (the )?(fta|federal tax authority|ministry of finance|mof)\b/i, "implied endorsement"],
  [/\b\d+(\.\d+)?\s?% (corporate tax|vat)\b/i, "hardcoded tax rate"],
  [/\b(corporate tax|vat) (rate|threshold) (is|of)\b/i, "hardcoded regulatory statement"],
  [/\bpenalt(y|ies) of aed\b/i, "hardcoded penalty"],
];

export function copyViolations(text: string): string[] {
  return FORBIDDEN_COPY.filter(([re]) => re.test(text)).map(([, why]) => why);
}
