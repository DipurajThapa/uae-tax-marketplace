import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

/** Liveness + DB readiness, and the outbox backlog for alerting. No personal data. */
export async function GET() {
  try {
    const r = await getDb().execute(
      sql`select (select count(*) from notifications where status in ('pending','failed') and next_attempt_at < now() - interval '15 minutes')::int as overdue_notifications,
                 (select count(*) from notifications where status = 'dead')::int as dead_notifications`,
    );
    const row = r.rows[0] as { overdue_notifications: number; dead_notifications: number };
    const degraded = row.overdue_notifications > 0 || row.dead_notifications > 0;
    return NextResponse.json({ status: degraded ? "degraded" : "ok", db: "ok", ...row }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "down", db: "unreachable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
