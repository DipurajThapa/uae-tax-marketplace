import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dataSources, importBatches } from "@/db/schema";
import { stageImport, ImportBlockedError, IMPORT_COLUMNS } from "@/lib/importer";
import { userActor } from "@/lib/audit";
import { requireAdmin, done, fail, uuidField, fmtDate, fmtDateTime, FlashMessages, StatusBadge, type Flash } from "../_shared";
import { unstable_rethrow } from "next/navigation";

export const metadata = { title: "Admin: import" };

const BACK = "/admin/import";
const MAX_BYTES = 2 * 1024 * 1024;

async function stage(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const sourceId = uuidField(formData, "sourceId");
  if (!sourceId) fail(BACK, "Choose a data source");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) fail(BACK, "Choose a non-empty CSV file");
  if (file.size > MAX_BYTES) fail(BACK, "The file is larger than 2 MB. Split it into smaller files.");
  const filename = (file.name || "upload.csv").replace(/[^\w.\- ]+/g, "_").slice(0, 200);
  if (!/\.csv$/i.test(filename)) fail(BACK, "Only .csv files can be imported");

  let result: { batchId: string; valid: number; invalid: number; duplicate: number } | null = null;
  let error: string | null = null;
  try {
    const csv = await file.text();
    result = await stageImport(getDb(), userActor(user.id), sourceId, filename, csv);
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ImportBlockedError) error = `Import blocked: ${err.message}`;
    else {
      console.error("[admin] stageImport failed", err);
      error = err instanceof Error ? err.message : "Import failed";
    }
  }
  if (error || !result) fail(BACK, error ?? "Import failed");
  done(`/admin/import/${result.batchId}`, `Staged: ${result.valid} valid, ${result.invalid} invalid, ${result.duplicate} duplicate. Nothing is created until you commit.`);
}

export default async function AdminImport({ searchParams }: { searchParams: Promise<Flash> }) {
  await requireAdmin();
  const flash = await searchParams;
  const db = getDb();
  const [sources, batches] = await Promise.all([
    db.select().from(dataSources).orderBy(dataSources.name),
    db
      .select({ b: importBatches, sourceName: dataSources.name })
      .from(importBatches)
      .innerJoin(dataSources, eq(dataSources.id, importBatches.sourceId))
      .orderBy(desc(importBatches.createdAt))
      .limit(30),
  ]);

  return (
    <div className="stack">
      <h1>Import providers from CSV</h1>
      <FlashMessages {...flash} />
      <div className="alert alert-info small">
        Imports are staged first. Committed rows become <strong>draft, unclaimed</strong> listings with no credentials; nothing is public until reviewed and published.
        A source can be used only after its terms have been reviewed, and official registers cannot be bulk-imported without the issuer’s written consent.
      </div>

      <form action={stage} className="card" aria-label="Stage a CSV import">
        <div className="field">
          <label htmlFor="sourceId">Data source</label>
          <select id="sourceId" name="sourceId" required defaultValue="">
            <option value="" disabled>Choose a source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.kind}) · {s.termsReviewedAt ? `terms reviewed ${fmtDate(s.termsReviewedAt)}` : "terms NOT reviewed"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="file">CSV file</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required aria-describedby="file-help" />
          <div className="help" id="file-help">UTF-8 CSV with a header row, maximum 2 MB. Lists inside a cell are separated with “|”.</div>
        </div>
        <button className="btn" type="submit">Upload and stage</button>
      </form>

      <section className="card" aria-labelledby="cols">
        <h2 id="cols">Expected columns</h2>
        <p className="small muted">Required: legal_name, kind, emirate, services. Use codes from the taxonomy for kind, emirate, services, jurisdictions and languages.</p>
        <div className="chips">
          {IMPORT_COLUMNS.map((c) => <code key={c} className="chip">{c}</code>)}
        </div>
      </section>

      <section aria-labelledby="sources">
        <h2 id="sources">Data sources</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Terms reviewed</th><th scope="col">Notes</th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.kind}</td>
                  <td>{s.termsReviewedAt ? fmtDate(s.termsReviewedAt) : <span className="badge badge-bad">Not reviewed</span>}</td>
                  <td className="small">{s.termsNotes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="batches">
        <h2 id="batches">Recent batches</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Created</th><th scope="col">File</th><th scope="col">Source</th><th scope="col">State</th></tr></thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={4} className="muted">No imports yet.</td></tr>
              ) : (
                batches.map(({ b, sourceName }) => (
                  <tr key={b.id}>
                    <td className="small">{fmtDateTime(b.createdAt)}</td>
                    <td><Link href={`/admin/import/${b.id}`}>{b.filename}</Link></td>
                    <td>{sourceName}</td>
                    <td><StatusBadge value={b.state} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
