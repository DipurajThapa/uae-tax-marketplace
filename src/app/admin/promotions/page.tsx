import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { promotions, organizations, subscriptions, plans } from "@/db/schema";
import { createPromotion, endPromotion } from "@/lib/promotions";
import { effectivePlan } from "@/lib/billing";
import { audit, userActor } from "@/lib/audit";
import { SERVICES, SERVICE_BY_CODE, EMIRATES, EMIRATE_BY_CODE, isEmirate, isService } from "@/lib/taxonomy";
import { requireAdmin, attempt, done, fail, text, oneOf, dateField, uuidField, fmtDate, FlashMessages, StatusBadge, type Flash } from "../_shared";

export const metadata = { title: "Admin: promotions" };

const BACK = "/admin/promotions";
const PLACEMENTS = ["search", "service_page", "location_page"] as const;
const PLACEMENT_LABEL: Record<(typeof PLACEMENTS)[number], string> = { search: "Search results", service_page: "Service page", location_page: "Location page" };

/** Organisations whose plan in force (per effectivePlan) allows promotion. */
async function promotableOrgs(now: Date) {
  const db = getDb();
  const subscribed = await db
    .selectDistinct({ id: organizations.id, legalName: organizations.legalName })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.code, subscriptions.planCode))
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .where(and(inArray(subscriptions.status, ["active", "trialing"]), eq(plans.canPromote, true)));
  const checked = await Promise.all(subscribed.map(async (o) => ({ ...o, plan: await effectivePlan(db, o.id, now) })));
  return checked.filter((o) => o.plan.canPromote).sort((a, b) => a.legalName.localeCompare(b.legalName));
}

async function create(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const orgId = uuidField(formData, "organizationId");
  if (!orgId) fail(BACK, "Choose an organisation");
  const placement = oneOf(formData, "placement", PLACEMENTS);
  if (!placement) fail(BACK, "Choose a placement");
  const serviceCode = text(formData, "serviceCode", 100) || null;
  if (serviceCode && !isService(serviceCode)) fail(BACK, "Unknown service");
  const emirate = text(formData, "emirate", 50) || null;
  if (emirate && !isEmirate(emirate)) fail(BACK, "Unknown emirate");
  const startsAt = dateField(formData, "startsAt");
  const endsAt = dateField(formData, "endsAt");
  if (!startsAt || !endsAt) fail(BACK, "Start and end dates are required");
  if (endsAt <= startsAt) fail(BACK, "The end date must be after the start date");
  const now = new Date();
  if (endsAt <= now) fail(BACK, "The end date must be in the future");

  const r = await attempt(() => createPromotion(getDb(), userActor(user.id), { organizationId: orgId, placement, serviceCode, emirate, startsAt, endsAt }, now));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Promotion created");
}

async function endEarly(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const id = uuidField(formData, "promotionId");
  if (!id) fail(BACK, "Unknown promotion");
  const r = await attempt(() => endPromotion(getDb(), userActor(user.id), id));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Promotion ended");
}

function stateOf(p: typeof promotions.$inferSelect, now: Date): string {
  if (!p.active) return "ended";
  if (p.endsAt <= now) return "expired";
  if (p.startsAt > now) return "scheduled";
  return "running";
}

export default async function AdminPromotions({ searchParams }: { searchParams: Promise<Flash> }) {
  await requireAdmin();
  const flash = await searchParams;
  const now = new Date();
  const db = getDb();
  const [rows, eligible] = await Promise.all([
    db
      .select({ p: promotions, orgName: organizations.legalName, listingStatus: organizations.listingStatus })
      .from(promotions)
      .innerJoin(organizations, eq(organizations.id, promotions.organizationId))
      .orderBy(desc(promotions.createdAt))
      .limit(200),
    promotableOrgs(now),
  ]);
  const today = now.toISOString().slice(0, 10);

  return (
    <div className="stack">
      <h1>Promotions</h1>
      <FlashMessages {...flash} />
      <p className="small muted">
        Promotions are shown as clearly labelled “Sponsored” placements and never change organic ranking or match scores. Only published listings are shown.
      </p>

      <section className="card" aria-labelledby="create">
        <h2 id="create">Create a promotion</h2>
        {eligible.length === 0 ? (
          <p className="muted">No organisation is currently on a plan that includes promotions. Start one on the <Link href="/admin/billing">billing page</Link> (test mode).</p>
        ) : (
          <form action={create}>
            <div className="grid grid-3">
              <div className="field">
                <label htmlFor="organizationId">Organisation</label>
                <select id="organizationId" name="organizationId" required defaultValue="">
                  <option value="" disabled>Choose an organisation</option>
                  {eligible.map((o) => <option key={o.id} value={o.id}>{o.legalName} ({o.plan.name})</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="placement">Placement</label>
                <select id="placement" name="placement" required defaultValue="search">
                  {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="serviceCode">Service (optional)</label>
                <select id="serviceCode" name="serviceCode" defaultValue="">
                  <option value="">Any service</option>
                  {SERVICES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="emirate">Emirate (optional)</label>
                <select id="emirate" name="emirate" defaultValue="">
                  <option value="">Any emirate</option>
                  {EMIRATES.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="startsAt">Start date</label>
                <input id="startsAt" name="startsAt" type="date" required defaultValue={today} />
              </div>
              <div className="field">
                <label htmlFor="endsAt">End date</label>
                <input id="endsAt" name="endsAt" type="date" required />
              </div>
            </div>
            <button className="btn" type="submit">Create promotion</button>
          </form>
        )}
      </section>

      <section aria-labelledby="list">
        <h2 id="list">All promotions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Organisation</th>
                <th scope="col">Placement</th>
                <th scope="col">Service</th>
                <th scope="col">Emirate</th>
                <th scope="col">Dates</th>
                <th scope="col">State</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="muted">No promotions.</td></tr>
              ) : (
                rows.map(({ p, orgName, listingStatus }) => {
                  const state = stateOf(p, now);
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/providers/${p.organizationId}`}>{orgName}</Link>
                        {listingStatus !== "published" && <div className="small muted">Listing is {listingStatus}: not shown</div>}
                      </td>
                      <td>{PLACEMENT_LABEL[p.placement as (typeof PLACEMENTS)[number]] ?? p.placement}</td>
                      <td>{p.serviceCode ? SERVICE_BY_CODE[p.serviceCode]?.name ?? p.serviceCode : "Any"}</td>
                      <td>{p.emirate ? EMIRATE_BY_CODE[p.emirate]?.name ?? p.emirate : "Any"}</td>
                      <td className="small">{fmtDate(p.startsAt)} to {fmtDate(p.endsAt)}</td>
                      <td><StatusBadge value={state} /></td>
                      <td>
                        {p.active && p.endsAt > now && (
                          <form action={endEarly}>
                            <input type="hidden" name="promotionId" value={p.id} />
                            <button className="btn btn-sm btn-danger" type="submit" aria-label={`End promotion for ${orgName} now`}>End now</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
