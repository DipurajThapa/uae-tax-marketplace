/**
 * Deterministic copy lint (CI). Fails on forbidden marketing/advice phrases and on
 * hardcoded regulatory claims in user-facing source. Prints file:line for every hit.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["src/app", "src/components", "src/lib/notify.ts", "src/lib/consent.ts", "src/lib/taxonomy.ts"];
const { FORBIDDEN_COPY: FORBIDDEN } = await import("../src/lib/copy-rules");
const EXT = new Set([".ts", ".tsx"]);

function walk(p: string, out: string[]) {
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p)) walk(path.join(p, f), out);
  else if (EXT.has(path.extname(p))) out.push(p);
}

const files: string[] = [];
for (const r of ROOTS) walk(r, files);
let hits = 0;
for (const f of files) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("lint-copy-ignore")) return;
      for (const [re, why] of FORBIDDEN)
        if (re.test(line)) {
          hits++;
          console.error(`${f}:${i + 1}: forbidden copy (${why}): ${line.trim().slice(0, 140)}`);
        }
    });
}
if (hits) {
  console.error(`\n${hits} copy violation(s).`);
  process.exit(1);
}
console.log(`copy lint: ${files.length} files clean`);
