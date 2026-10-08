import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { notifications, enquiryRecipients } from "@/db/schema";
import { config } from "./config";
import { audit, SYSTEM, type Actor } from "./audit";

export type Template = "provider_new_enquiry" | "buyer_enquiry_receipt" | "claim_decision" | "account_created" | "provider_enquiry_withdrawn" | "password_reset" | "verify_email";

export type Mail = { to: string; subject: string; text: string };

export interface MailTransport {
  send(mail: Mail): Promise<void>;
}

/** Development/test transport: writes each message to var/mail as a file. Nothing leaves the machine. */
export const fileTransport: MailTransport = {
  async send(mail) {
    if (config.isProduction) throw new Error("file mail transport is disabled in production");
    const dir = path.join(process.cwd(), "var", "mail");
    await mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}.txt`;
    await writeFile(path.join(dir, name), `To: ${mail.to}\nFrom: ${config.mailFrom}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
  },
};

export function defaultTransport(): MailTransport {
  if (config.mailTransport === "smtp") {
    // BLOCKED (TASK_BACKLOG OPS-03): no email provider approved yet. Fail loudly instead of silently dropping.
    return { send: async () => { throw new Error("SMTP transport not configured"); } };
  }
  return fileTransport;
}

type Insertable = Pick<DB, "insert">;

export async function enqueue(
  db: Insertable,
  n: { to: string; template: Template; payload: Record<string, unknown>; enquiryRecipientId?: string },
  now: Date = new Date(),
): Promise<void> {
  // Due time comes from the injected clock, not the DB clock, so scheduling is deterministic.
  await db.insert(notifications).values({ toAddress: n.to, template: n.template, payload: n.payload, enquiryRecipientId: n.enquiryRecipientId ?? null, nextAttemptAt: now, createdAt: now });
}

/**
 * Templates contain no free text from LLMs and no regulatory claims.
 * Provider emails carry no buyer contact details: the provider signs in to view the enquiry,
 * so personal data is not spread across mailboxes and access is logged.
 */
export function render(template: Template, p: Record<string, unknown>): Omit<Mail, "to"> {
  const site = config.siteUrl;
  switch (template) {
    case "provider_new_enquiry":
      return {
        subject: `New enquiry ${p.ref} for ${p.orgName}`,
        text: `A business has chosen to contact ${p.orgName} through the directory.\n\nServices requested: ${(p.services as string[]).join(", ")}\nEmirate: ${p.emirate}\n\nSign in to view the enquiry and the contact details: ${site}/provider/enquiries/${p.recipientId}\n\nPlease accept or decline within 2 business days so the business can look elsewhere if needed.`,
      };
    case "buyer_enquiry_receipt":
      return {
        subject: `Your enquiry ${p.ref} has been sent`,
        text: `Hello ${p.name},\n\nYour enquiry ${p.ref} was sent only to the providers you chose:\n${(p.providers as string[]).map((x) => `- ${x}`).join("\n")}\n\nThey can see the contact details and answers you gave. They will contact you directly.\n\nTo withdraw the enquiry and erase your details, use this link: ${site}/enquiry/manage/${p.manageToken}\n\nThis directory does not give tax advice and does not take part in any engagement you agree with a provider.`,
      };
    case "provider_enquiry_withdrawn":
      return {
        subject: `Enquiry ${p.ref} was withdrawn`,
        text: `The business that sent enquiry ${p.ref} has withdrawn it and asked for their details to be erased. Please delete any copy of their contact details you have kept.`,
      };
    case "claim_decision":
      return p.approved
        ? {
            subject: `Your claim for ${p.orgName} was approved`,
            text: `Your claim for ${p.orgName} was approved. Set your password with this link (valid for 72 hours): ${site}/set-password/${p.setPasswordToken}\nThen sign in at ${site}/login with this email address.`,
          }
        : {
            subject: `Your claim for ${p.orgName} was not approved`,
            text: `We could not confirm that you represent ${p.orgName}.${p.note ? `\nReviewer note: ${p.note}` : ""}\nYou can submit a new claim with further evidence.`,
          };
    case "verify_email":
      return {
        subject: "Confirm your email address",
        text: `Please confirm this email address so your firm can receive enquiries through the directory: ${site}/verify-email/${p.setPasswordToken}\nThe link works once and expires in 72 hours. If you did not create a listing, ignore this email.`,
      };
    case "password_reset":
      return {
        subject: "Reset your password",
        text: `Someone asked to reset the password for this account. If it was you, use this link within 1 hour: ${site}/set-password/${p.setPasswordToken}\nIf it was not you, ignore this email; your password has not changed.`,
      };
    case "account_created":
      return { subject: "Your account", text: `An account was created for you. Sign in at ${site}/login.` };
  }
}

const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

/** One-time secrets needed only to render the email. Removed from the stored payload once sent. */
const SECRET_KEYS = ["setPasswordToken", "manageToken"];
const redact = (payload: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, SECRET_KEYS.includes(k) ? "[redacted after send]" : v]));

/** Processes due notifications. Safe to run concurrently (SKIP LOCKED). Returns counts. */
export async function processOutbox(db: DB, transport: MailTransport = defaultTransport(), now = new Date(), batch = 50) {
  const result = { sent: 0, failed: 0, dead: 0 };
  const due = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(notifications)
      .where(and(inArray(notifications.status, ["pending", "failed"]), lte(notifications.nextAttemptAt, now)))
      .orderBy(notifications.nextAttemptAt)
      .limit(batch)
      .for("update", { skipLocked: true });
    // Claim rows by pushing next_attempt_at forward so a concurrent worker does not pick them up.
    if (rows.length)
      await tx.update(notifications).set({ nextAttemptAt: new Date(now.getTime() + 5 * 60_000) }).where(inArray(notifications.id, rows.map((r) => r.id)));
    return rows;
  });

  for (const n of due) {
    const attempts = n.attempts + 1;
    try {
      const mail = render(n.template as Template, n.payload as Record<string, unknown>);
      await transport.send({ to: n.toAddress, ...mail });
      await db.transaction(async (tx) => {
        await tx
          .update(notifications)
          .set({ status: "sent", attempts, sentAt: now, lastError: null, payload: redact(n.payload as Record<string, unknown>) })
          .where(eq(notifications.id, n.id));
        if (n.enquiryRecipientId)
          await tx
            .update(enquiryRecipients)
            .set({ status: sql`case when ${enquiryRecipients.status} = 'pending' then 'notified'::recipient_status else ${enquiryRecipients.status} end`, notifiedAt: now })
            .where(eq(enquiryRecipients.id, n.enquiryRecipientId));
      });
      result.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempts >= n.maxAttempts) {
        await db.transaction(async (tx) => {
          await tx.update(notifications).set({ status: "dead", attempts, lastError: message }).where(eq(notifications.id, n.id));
          await audit(tx, SYSTEM, "notification.dead", "notification", n.id, { template: n.template, error: message });
        });
        result.dead++;
      } else {
        const delay = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]!;
        await db
          .update(notifications)
          .set({ status: "failed", attempts, lastError: message, nextAttemptAt: new Date(now.getTime() + delay * 60_000) })
          .where(eq(notifications.id, n.id));
        result.failed++;
      }
    }
  }
  return result;
}

/** Admin action: put a dead or failed notification back in the queue. */
export async function retryNotification(db: DB, actor: Actor, id: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(notifications)
      .set({ status: "pending", attempts: 0, nextAttemptAt: now })
      .where(and(eq(notifications.id, id), inArray(notifications.status, ["failed", "dead"])))
      .returning({ id: notifications.id });
    if (updated.length === 0) throw new Error("Only failed or dead notifications can be retried");
    await audit(tx, actor, "notification.retry", "notification", id);
  });
}
