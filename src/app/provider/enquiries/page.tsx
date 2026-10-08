import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { enquiries, enquiryRecipients, leadCharges } from "@/db/schema";
import { requireProvider } from "@/lib/session";
import { EMIRATE_BY_CODE, SERVICE_BY_CODE } from "@/lib/taxonomy";
import { Empty } from "@/components/ui";
import { Flash, RecipientStatus, chargeLabel, fmtDate } from "../_ui";

export const metadata = { title: "Enquiries", robots: { index: false } };

const PAGE_SIZE = 50;

export default async function ProviderEnquiries({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; page?: string }> }) {
  const user = await requireProvider();
  const { notice, error, page: pageRaw } = await searchParams;
  const page = Math.max(1, Math.min(Number.parseInt(pageRaw ?? "1", 10) || 1, 1000));

  // Always scoped to the signed-in user's organisation.
  const rows = await getDb()
    .select({
      rec: enquiryRecipients,
      ref: enquiries.publicRef,
      services: enquiries.serviceCodes,
      emirate: enquiries.emirate,
      enqStatus: enquiries.status,
      charge: { included: leadCharges.included, amountAed: leadCharges.amountAed, status: leadCharges.status },
    })
    .from(enquiryRecipients)
    .innerJoin(enquiries, eq(enquiries.id, enquiryRecipients.enquiryId))
    .leftJoin(leadCharges, eq(leadCharges.enquiryRecipientId, enquiryRecipients.id))
    .where(eq(enquiryRecipients.organizationId, user.organizationId))
    .orderBy(desc(enquiryRecipients.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);

  return (
    <div className="stack">
      <h1>Enquiries</h1>
      <Flash notice={notice} error={error} />
      <p className="muted">
        Each enquiry comes from a business that chose your firm. Open one to see the contact details and answers, then accept or decline it.
      </p>
      {items.length === 0 ? (
        <Empty title={page > 1 ? "No more enquiries" : "No enquiries yet"}>
          <p className="small muted">Enquiries arrive only while your listing is published, claimed and accepting enquiries.</p>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Received</th>
                <th scope="col">Services</th>
                <th scope="col">Emirate</th>
                <th scope="col">Status</th>
                <th scope="col">Match score</th>
                <th scope="col">Lead charge</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.rec.id}>
                  <td>
                    <Link href={`/provider/enquiries/${r.rec.id}`}>{r.ref}</Link>
                  </td>
                  <td>{fmtDate(r.rec.createdAt)}</td>
                  <td>{r.services.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</td>
                  <td>{EMIRATE_BY_CODE[r.emirate]?.name ?? r.emirate}</td>
                  <td>
                    <RecipientStatus status={r.rec.status} erased={r.enqStatus === "erased"} />
                  </td>
                  <td>
                    <span className="score">{r.rec.matchScore}</span>
                  </td>
                  <td className="small">{chargeLabel(r.charge?.status ? r.charge : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(page > 1 || hasMore) && (
        <nav className="pagination" aria-label="Pages">
          {page > 1 && (
            <Link className="btn btn-secondary btn-sm" href={`/provider/enquiries?page=${page - 1}`}>
              Previous
            </Link>
          )}
          {hasMore && (
            <Link className="btn btn-secondary btn-sm" href={`/provider/enquiries?page=${page + 1}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
