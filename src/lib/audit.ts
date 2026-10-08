import type { DB } from "@/db/client";
import { auditLog } from "@/db/schema";

export type Actor = { userId: string | null; label: string };
export const SYSTEM: Actor = { userId: null, label: "system" };
export const PUBLIC: Actor = { userId: null, label: "public" };
export const userActor = (userId: string): Actor => ({ userId, label: `user:${userId}` });

type Tx = Pick<DB, "insert">;

export async function audit(
  db: Tx,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(auditLog).values({ actorUserId: actor.userId, actorLabel: actor.label, action, entityType, entityId, details });
}
