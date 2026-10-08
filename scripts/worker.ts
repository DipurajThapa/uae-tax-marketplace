/**
 * Background worker: notification outbox, credential freshness sweep, retention and
 * rate-limit pruning. Run as a separate process (npm run worker). --once for cron/CI.
 */
import { loadEnv } from "./env";
loadEnv();
const { getDb, closeDb } = await import("../src/db/client");
const { processOutbox } = await import("../src/lib/notify");
const { sweepStaleCredentials } = await import("../src/lib/verification");
const { applyRetention } = await import("../src/lib/enquiry");
const { pruneRateLimits } = await import("../src/lib/ratelimit");
const { SYSTEM } = await import("../src/lib/audit");

const db = getDb();
const once = process.argv.includes("--once");
let lastHourly = 0;

async function tick() {
  const now = new Date();
  const out = await processOutbox(db, undefined, now);
  if (out.sent || out.failed || out.dead) console.log(JSON.stringify({ at: now.toISOString(), job: "outbox", ...out }));
  if (once || now.getTime() - lastHourly > 3600_000) {
    lastHourly = now.getTime();
    const expired = await sweepStaleCredentials(db, now);
    const erased = await applyRetention(db, SYSTEM, now);
    await pruneRateLimits(db, new Date(now.getTime() - 2 * 86400_000));
    console.log(JSON.stringify({ at: now.toISOString(), job: "hourly", expiredCredentials: expired, erasedEnquiries: erased }));
  }
}

if (once) {
  await tick();
  await closeDb();
} else {
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  while (!stopping) {
    try { await tick(); } catch (e) { console.error(JSON.stringify({ job: "tick", error: String(e) })); }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  await closeDb();
}
