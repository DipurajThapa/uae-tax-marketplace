/**
 * Performance budget (ENG-11). Runs Lighthouse (mobile emulation, simulated throttling) against a
 * running production server and fails if any page misses the budget from BUILD/§11.1-style targets:
 * LCP < 2.5 s, CLS < 0.1, TBT < 200 ms (lab proxy for INP), performance score >= 0.9.
 * Each page runs RUNS times (default 5) and the median of each metric is judged, as Lighthouse
 * recommends: single lab samples on shared CI runners vary too much (a 217 ms TBT outlier on one run
 * of a page that measures ~75 ms; three runs of one commit gave /match 230/219/163). Five samples
 * make the median robust to two outliers. Thresholds are not relaxed.
 * Usage: BASE_URL=http://localhost:3200 CHROME_PATH=/path/to/chrome node scripts/perf-budget.mjs
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const base = process.env.BASE_URL ?? "http://localhost:3200";
const pages = (process.env.PAGES ?? "/,/providers,/providers/e2e-verified-tax-agency,/match,/services/vat-returns").split(",");
const budget = { lcp: 2500, cls: 0.1, tbt: 200, score: 0.9 };
const RUNS = Math.max(1, Number(process.env.RUNS ?? 5));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
const rows = [];
let failed = false;
try {
  for (const path of pages) {
    const samples = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await lighthouse(base + path, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] });
      const a = r.lhr.audits;
      samples.push({
        score: r.lhr.categories.performance.score,
        lcp: a["largest-contentful-paint"].numericValue,
        cls: a["cumulative-layout-shift"].numericValue,
        tbt: a["total-blocking-time"].numericValue,
        js: (a["resource-summary"]?.details?.items?.find((x) => x.resourceType === "script")?.transferSize ?? 0) / 1024,
      });
    }
    const row = {
      page: path,
      score: median(samples.map((x) => x.score)),
      lcp_ms: Math.round(median(samples.map((x) => x.lcp))),
      cls: Number(median(samples.map((x) => x.cls)).toFixed(3)),
      tbt_ms: Math.round(median(samples.map((x) => x.tbt))),
      tbt_runs: samples.map((x) => Math.round(x.tbt)).join("/"),
      js_kb: Math.round(median(samples.map((x) => x.js))),
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
