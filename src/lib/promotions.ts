import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { promotions, organizations } from "@/db/schema";
import { audit, type Actor } from "./audit";
import { effectivePlan } from "./billing";
import { isEmirate, isService } from "./taxonomy";

export const PLACEMENTS = ["search", "service_page", "location_page"] as const;

export const promotionSchema = z
  .object({
    organizationId: z.string().uuid(),
    placement: z.enum(PLACEMENTS),
    serviceCode: z.string().refine(isService, "Unknown service").nullable(),
    emirate: z.string().refine(isEmirate, "Unknown emirate").nullable(),
    startsAt: z.date(),
    endsAt: z.date(),
  })
  .refine((p) => p.endsAt > p.startsAt, { message: "The end date must be after the start date", path: ["endsAt"] });

/** Creates a labelled, time-boxed placement. Only organisations whose plan in force includes promotions qualify. */
export async function createPromotion(db: DB, actor: Actor, input: z.input<typeof promotionSchema>, now = new Date()) {
  const p = promotionSchema.parse(input);
  if (p.endsAt <= now) throw new Error("The end date must be in the future");
  const [org] = await db.select({ id: organizations.id, listingStatus: organizations.listingStatus }).from(organizations).where(eq(organizations.id, p.organizationId));
  if (!org) throw new Error("Organisation not found");
  if (org.listingStatus !== "published") throw new Error("Only published listings can be promoted");
  const plan = await effectivePlan(db, p.organizationId, now);
  if (!plan.canPromote) throw new Error(`The current plan (${plan.name}) does not include promotions`);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(promotions).values({ ...p, active: true }).returning({ id: promotions.id });
    await audit(tx, actor, "promotion.created", "promotion", row!.id, { ...p, startsAt: p.startsAt.toISOString(), endsAt: p.endsAt.toISOString(), plan: plan.code });
    return row!.id;
  });
}

export async function endPromotion(db: DB, actor: Actor, id: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const ended = await tx.update(promotions).set({ active: false }).where(and(eq(promotions.id, id), eq(promotions.active, true))).returning({ id: promotions.id });
    if (ended.length === 0) throw new Error("Promotion not found or already ended");
    await audit(tx, actor, "promotion.ended", "promotion", id, { endedAt: now.toISOString() });
  });
}
