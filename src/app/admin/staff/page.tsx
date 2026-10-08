import { inArray, asc, isNotNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { resetMfa } from "@/lib/mfa";
import { userActor } from "@/lib/audit";
import { requireAdmin, attempt, done, fail, uuidField, text, fmtDateTime, FlashMessages, type Flash } from "../_shared";

export const metadata = { title: "Admin: staff" };

const BACK = "/admin/staff";

/** Recovery for someone who lost their authenticator (review2 L6, ENG-16). Admin-only, never your own account. */
async function reset(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const userId = uuidField(formData, "userId");
  if (!userId) fail(BACK, "Unknown account");
  if (text(formData, "confirm", 10) !== "yes") fail(BACK, "Tick the box to confirm you checked who is asking");
  const r = await attempt(() => resetMfa(getDb(), userActor(user.id), userId));
  if (!r.ok) fail(BACK, r.error);
  done(BACK, "Two-factor authentication reset. Their sessions have ended; they set it up again at next sign-in.");
}

export default async function Staff({ searchParams }: { searchParams: Promise<Flash> }) {
  const me = await requireAdmin();
  const flash = await searchParams;
  const staff = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, disabled: users.disabled, totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(or(inArray(users.role, ["admin", "reviewer"]), isNotNull(users.totpEnabledAt)))
    .orderBy(asc(users.role), asc(users.email));
  return (
    <div className="stack">
      <h1>Staff and two-factor</h1>
      <FlashMessages {...flash} />
      <p className="muted">Staff accounts, and provider accounts that turned on two-factor. Reset a factor only after confirming the request with the person by a channel other than email (for example a call). Every reset is in the audit log.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Two-factor</th><th scope="col">Action</th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<br /><span className="small muted">{u.email}{u.disabled ? " · disabled" : ""}</span></td>
                <td>{u.role}</td>
                <td>{u.totpEnabledAt ? `On since ${fmtDateTime(u.totpEnabledAt)}` : "Not set up"}</td>
                <td>
                  {u.id === me.id ? (
                    <span className="small muted">Ask another admin</span>
                  ) : (
                    <form action={reset} aria-label={`Reset two-factor for ${u.email}`}>
                      <input type="hidden" name="userId" value={u.id} />
                      <label className="option small"><input type="checkbox" name="confirm" value="yes" required /> Identity confirmed</label>
                      <button className="btn btn-sm btn-danger" type="submit">Reset two-factor</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
