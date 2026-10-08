/**
 * Performance budget (ENG-11). Runs Lighthouse (mobile emulation, simulated throttling) against a
 * running production server and fails if any page misses the budget from BUILD/§11.1-style targets:
 * LCP < 2.5 s, CLS < 0.1, TBT < 200 ms (lab proxy for INP), performance score >= 0.9.
 * Usage: BASE_URL=http://localhost:3200 CHROME_PATH=/path/to/chrome node scripts/perf-budget.mjs
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const base = process.env.BASE_URL ?? "http://localhost:3200";
const pages = (process.env.PAGES ?? "/,/providers,/providers/e2e-verified-tax-agency,/match,/services/vat-returns").split(",");
const budget = { lcp: 2500, cls: 0.1, tbt: 200, score: 0.9 };

const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
const rows = [];
let failed = false;
try {
  for (const path of pages) {
    const r = await lighthouse(base + path, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] });
    const a = r.lhr.audits;
    const row = {
      page: path,
      score: r.lhr.categories.performance.score,
      lcp_ms: Math.round(a["largest-contentful-paint"].numericValue),
      cls: Number(a["cumulative-layout-shift"].numericValue.toFixed(3)),
      tbt_ms: Math.round(a["total-blocking-time"].numericValue),
      js_kb: Math.round((a["resource-summary"]?.details?.items?.find((i) => i.resourceType === "script")?.transferSize ?? 0) / 1024),
    };
    row.pass = row.lcp_ms < budget.lcp && row.cls < budget.cls && row.tbt_ms < budget.tbt && row.score >= budget.score;
    if (!row.pass) failed = true;
    rows.push(row);
  }
} finally {
  await chrome.kill();
}
console.table(rows);
if (failed) {
  console.error(`Performance budget missed (LCP < ${budget.lcp} ms, CLS < ${budget.cls}, TBT < ${budget.tbt} ms, score >= ${budget.score}).`);
  process.exit(1);
}
console.log("performance budget met");
