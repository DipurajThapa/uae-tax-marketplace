import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dataSources, importBatches, importRows, users } from "@/db/schema";
import { commitImport, discardImport } from "@/lib/importer";
import { userActor } from "@/lib/audit";
import { requireAdmin, attempt, done, fail, uuidField, isUuid, fmtDateTime, FlashMessages, StatusBadge, type Flash } from "../../_shared";

export const metadata = { title: "Admin: import batch" };

async function commit(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const batchId = uuidField(formData, "batchId");
  if (!batchId) fail("/admin/import", "Unknown batch");
  const back = `/admin/import/${batchId}`;
  const r = await attempt(() => commitImport(getDb(), userActor(user.id), batchId));
  if (!r.ok) fail(back, r.error);
  done(back, `Committed: ${r.value.created} draft listing${r.value.created === 1 ? "" : "s"} created`);
}

async function discard(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const batchId = uuidField(formData, "batchId");
  if (!batchId) fail("/admin/import", "Unknown batch");
  const back = `/admin/import/${batchId}`;
  const db = getDb();
  const [b] = await db.select({ state: importBatches.state }).from(importBatches).where(eq(importBatches.id, batchId));
  if (!b) fail("/admin/import", "Batch not found");
  if (b.state !== "staged") fail(back, `Only a staged batch can be discarded (this one is ${b.state})`);
  const r = await attempt(() => discardImport(db, userActor(user.id), batchId));
  if (!r.ok) fail(back, r.error);
  done(back, "Batch discarded");
}

function rawField(raw: unknown, key: string): string {
  if (raw && typeof raw === "object" && key in raw) {
    const v = (raw as Record<string, unknown>)[key];
    return typeof v === "string" ? v : "";
  }
  return "";
}

export default async function AdminImportBatch({ params, searchParams }: { params: Promise<{ batchId: string }>; searchParams: Promise<Flash> }) {
  await requireAdmin();
  const { batchId } = await params;
  const flash = await searchParams;
  if (!isUuid(batchId)) notFound();
  const db = getDb();
  const [row] = await db
    .select({ b: importBatches, source: dataSources, by: { name: users.name, email: users.email } })
    .from(importBatches)
    .innerJoin(dataSources, eq(dataSources.id, importBatches.sourceId))
    .innerJoin(users, eq(users.id, importBatches.createdBy))
    .where(eq(importBatches.id, batchId));
  if (!row) notFound();
  const rows = await db.select().from(importRows).where(eq(importRows.batchId, batchId)).orderBy(importRows.rowNumber);
  const tally = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.state]: (acc[r.state] ?? 0) + 1 }), {});
  const { b, source } = row;

  return (
    <div className="stack">
      <p className="small"><Link href="/admin/import">← Import</Link></p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Import batch: {b.filename}</h1>
        <StatusBadge value={b.state} />
      </div>
      <FlashMessages {...flash} />
      <dl className="dl card">
        <dt>Source</dt><dd>{source.name} ({source.kind})</dd>
        <dt>Uploaded</dt><dd>{fmtDateTime(b.createdAt)} by {row.by.name}</dd>
        <dt>Committed</dt><dd>{fmtDateTime(b.committedAt)}</dd>
        <dt>Rows</dt><dd>{rows.length} total · {Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(", ") || "none"}</dd>
      </dl>

      {b.state === "staged" && (
        <div className="row">
          <form action={commit}>
            <input type="hidden" name="batchId" value={b.id} />
            <button className="btn" type="submit" disabled={!tally.valid}>Commit {tally.valid ?? 0} valid row{tally.valid === 1 ? "" : "s"} as draft listings</button>
          </form>
          <form action={discard}>
            <input type="hidden" name="batchId" value={b.id} />
            <button className="btn btn-danger" type="submit">Discard batch</button>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Legal name</th>
              <th scope="col">Kind</th>
              <th scope="col">Emirate</th>
              <th scope="col">Services</th>
              <th scope="col">State</th>
              <th scope="col">Errors / notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="muted">The file had no data rows.</td></tr>
            ) : (
              rows.map((r) => {
                const errors = Array.isArray(r.errors) ? (r.errors as unknown[]).map(String) : [];
                return (
                  <tr key={r.id}>
                    <td>{r.rowNumber}</td>
                    <td>{rawField(r.raw, "legal_name") || <span className="muted">—</span>}</td>
                    <td className="small">{rawField(r.raw, "kind")}</td>
                    <td className="small">{rawField(r.raw, "emirate")}</td>
                    <td className="small">{rawField(r.raw, "services")}</td>
                    <td><StatusBadge value={r.state} /></td>
                    <td className="small">
                      {errors.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                      {r.duplicateOfOrganizationId && <div>Duplicate of <Link href={`/admin/providers/${r.duplicateOfOrganizationId}`}>existing listing</Link></div>}
                      {r.committedOrganizationId && <div>Created <Link href={`/admin/providers/${r.committedOrganizationId}`}>draft listing</Link></div>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
