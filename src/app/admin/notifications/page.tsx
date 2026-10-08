import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";
import { processOutbox, retryNotification } from "@/lib/notify";
import { userActor } from "@/lib/audit";
import { requireStaff, attempt, done, fail, param, uuidField, fmtDateTime, maskEmail, FlashMessages, StatusBadge } from "../_shared";

export const metadata = { title: "Admin: notifications" };

const STATUSES = ["pending", "sent", "failed", "dead"] as const;
type Status = (typeof STATUSES)[number];
const LIMIT = 200;

const backTo = (status: string) => (status ? `/admin/notifications?status=${status}` : "/admin/notifications");

async function retry(formData: FormData) {
  "use server";
  const user = await requireStaff();
  const filter = (STATUSES as readonly string[]).includes(String(formData.get("filter"))) ? String(formData.get("filter")) : "";
  const back = backTo(filter);
  const id = uuidField(formData, "notificationId");
  if (!id) fail(back, "Unknown notification");
  const db = getDb();
  const [row] = await db.select({ status: notifications.status }).from(notifications).where(eq(notifications.id, id));
  if (!row) fail(back, "Notification not found");
  // Only failed or dead messages may be re-queued; re-queuing a sent one would email it again.
  if (row.status !== "failed" && row.status !== "dead") fail(back, `Only failed or dead notifications can be retried (this one is ${row.status})`);
  const r = await attempt(() => retryNotification(db, userActor(user.id), id));
  if (!r.ok) fail(back, r.error);
  done(back, "Notification queued for another attempt");
}

async function processNow(formData: FormData) {
  "use server";
  await requireStaff();
  const filter = (STATUSES as readonly string[]).includes(String(formData.get("filter"))) ? String(formData.get("filter")) : "";
  const back = backTo(filter);
  const r = await attempt(() => processOutbox(getDb()));
  if (!r.ok) fail(back, r.error);
  done(back, `Outbox processed: ${r.value.sent} sent, ${r.value.failed} failed, ${r.value.dead} dead`);
}

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const statusParam = param(sp.status, 20);
  const status = (STATUSES as readonly string[]).includes(statusParam) ? (statusParam as Status) : null;
  const notice = param(sp.notice, 300);
  const error = param(sp.error, 300);
  const db = getDb();
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: notifications.id,
        template: notifications.template,
        toAddress: notifications.toAddress,
        status: notifications.status,
        attempts: notifications.attempts,
        maxAttempts: notifications.maxAttempts,
        lastError: notifications.lastError,
        nextAttemptAt: notifications.nextAttemptAt,
        sentAt: notifications.sentAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(status ? eq(notifications.status, status) : undefined)
      .orderBy(desc(notifications.createdAt))
      .limit(LIMIT),
    db.select({ status: notifications.status, n: sql<number>`count(*)::int` }).from(notifications).groupBy(notifications.status),
  ]);
  const count = (s: Status) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <div className="stack">
      <h1>Notifications outbox</h1>
      <FlashMessages notice={notice || undefined} error={error || undefined} />
      <p className="small muted">Message bodies are not shown here because they can contain one-time links. Recipient addresses are masked.</p>
      <div className="row between">
        <nav className="row" aria-label="Filter by status">
          <Link href="/admin/notifications" aria-current={!status ? "page" : undefined}>All</Link>
          {STATUSES.map((s) => (
            <Link key={s} href={`/admin/notifications?status=${s}`} aria-current={status === s ? "page" : undefined}>
              {s} ({count(s)})
            </Link>
          ))}
        </nav>
        <form action={processNow}>
          <input type="hidden" name="filter" value={status ?? ""} />
          <button className="btn" type="submit">Process outbox now</button>
        </form>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Created</th>
              <th scope="col">Template</th>
              <th scope="col">To</th>
              <th scope="col">Status</th>
              <th scope="col">Attempts</th>
              <th scope="col">Next attempt / sent</th>
              <th scope="col">Last error</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="muted">No notifications.</td></tr>
            ) : (
              rows.map((n) => (
                <tr key={n.id}>
                  <td className="small">{fmtDateTime(n.createdAt)}</td>
                  <td>{n.template}</td>
                  <td className="small">{maskEmail(n.toAddress)}</td>
                  <td><StatusBadge value={n.status} /></td>
                  <td>{n.attempts} / {n.maxAttempts}</td>
                  <td className="small">{n.status === "sent" ? fmtDateTime(n.sentAt) : fmtDateTime(n.nextAttemptAt)}</td>
                  <td className="small">{n.lastError ?? "—"}</td>
                  <td>
                    {(n.status === "failed" || n.status === "dead") && (
                      <form action={retry}>
                        <input type="hidden" name="notificationId" value={n.id} />
                        <input type="hidden" name="filter" value={status ?? ""} />
                        <button className="btn btn-sm btn-secondary" type="submit" aria-label={`Retry ${n.template} notification to ${maskEmail(n.toAddress)}`}>Retry</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
