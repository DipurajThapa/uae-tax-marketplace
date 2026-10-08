import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { enquiries, enquiryRecipients, organizations } from "@/db/schema";
import { EMIRATE_BY_CODE, SERVICE_BY_CODE } from "@/lib/taxonomy";
import { requireStaff, param, fmtDateTime, maskEmail, StatusBadge } from "../_shared";

export const metadata = { title: "Admin: enquiries" };

const STATUSES = ["received", "routed", "spam", "withdrawn", "erased"] as const;
const LIMIT = 200;

export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const statusParam = param(sp.status, 20);
  const status = (STATUSES as readonly string[]).includes(statusParam) ? (statusParam as (typeof STATUSES)[number]) : null;
  const db = getDb();
  const rows = await db
    .select({
      id: enquiries.id,
      publicRef: enquiries.publicRef,
      createdAt: enquiries.createdAt,
      status: enquiries.status,
      serviceCodes: enquiries.serviceCodes,
      emirate: enquiries.emirate,
      contactEmail: enquiries.contactEmail,
    })
    .from(enquiries)
    .where(status ? eq(enquiries.status, status) : undefined)
    .orderBy(desc(enquiries.createdAt))
    .limit(LIMIT);
  const recips = rows.length
    ? await db
        .select({ enquiryId: enquiryRecipients.enquiryId, status: enquiryRecipients.status, orgName: organizations.legalName, tradeName: organizations.tradeName })
        .from(enquiryRecipients)
        .innerJoin(organizations, eq(organizations.id, enquiryRecipients.organizationId))
        .where(inArray(enquiryRecipients.enquiryId, rows.map((r) => r.id)))
    : [];

  return (
    <div className="stack">
      <h1>Enquiries</h1>
      <p className="small muted">Contact emails are masked here. Opening an enquiry shows the full record and is recorded in the audit log.</p>
      <form method="get" className="row">
        <label htmlFor="status" style={{ margin: 0 }}>Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} style={{ maxWidth: 200 }}>
          <option value="">Any</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-sm btn-secondary" type="submit">Filter</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Ref</th>
              <th scope="col">Created</th>
              <th scope="col">Status</th>
              <th scope="col">Contact</th>
              <th scope="col">Services</th>
              <th scope="col">Emirate</th>
              <th scope="col">Recipients</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="muted">No enquiries.</td></tr>
            ) : (
              rows.map((e) => {
                const mine = recips.filter((r) => r.enquiryId === e.id);
                return (
                  <tr key={e.id}>
                    <td><Link href={`/admin/enquiries/${e.id}`}>{e.publicRef}</Link></td>
                    <td className="small">{fmtDateTime(e.createdAt)}</td>
                    <td><StatusBadge value={e.status} /></td>
                    <td className="small">{maskEmail(e.contactEmail)}</td>
                    <td className="small">{e.serviceCodes.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</td>
                    <td>{EMIRATE_BY_CODE[e.emirate]?.name ?? e.emirate}</td>
                    <td className="small">
                      <strong>{mine.length}</strong>
                      {mine.length > 0 && (
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                          {mine.map((r, i) => (
                            <li key={i}>{r.tradeName ?? r.orgName}: {r.status}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {rows.length === LIMIT && <p className="small muted">Showing the latest {LIMIT}. Use the status filter to narrow the list.</p>}
    </div>
  );
}
