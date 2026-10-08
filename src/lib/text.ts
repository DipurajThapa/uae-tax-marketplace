const LEGAL_SUFFIXES = [
  "llc", "l.l.c", "fze", "fzco", "fz llc", "fz-llc", "dmcc", "est", "establishment", "co", "company",
  "limited", "ltd", "llp", "plc", "pjsc", "branch", "sole proprietorship", "spc",
];

/** Normalises a business name for duplicate detection: case, punctuation, legal suffixes, "&"/"and". */
export function normalizeName(name: string): string {
  let s = name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/&/g, " and ").replace(/[^a-z0-9؀-ۿ ]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of LEGAL_SUFFIXES) {
      const norm = suf.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      if (s.endsWith(" " + norm)) {
        s = s.slice(0, -(norm.length + 1)).trim();
        changed = true;
      }
    }
  }
  return s.replace(/\b(the|and)\b/g, "").replace(/\s+/g, " ").trim();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Levenshtein-based similarity in [0,1]. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[b.length]! / Math.max(a.length, b.length);
}

export function domainOf(urlOrEmail: string | null | undefined): string | null {
  if (!urlOrEmail) return null;
  const s = urlOrEmail.trim().toLowerCase();
  if (s.includes("@") && !s.includes("/")) return s.split("@").pop()!.replace(/^www\./, "") || null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
