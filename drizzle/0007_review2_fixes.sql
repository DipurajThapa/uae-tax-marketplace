ALTER TABLE "sessions" ALTER COLUMN "stage" SET DEFAULT 'mfa';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "reviewed_content_hash" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "review_recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD COLUMN "professional_name" text;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "pending_totp_enc" text;--> statement-breakpoint
CREATE INDEX "analytics_events_org_idx" ON "analytics_events" USING btree (("props"->>'orgId'),"created_at");--> statement-breakpoint
-- H1: a person's synthetic flag follows their firm; the trigger checks the firm, not only the person.
UPDATE "professionals" p SET "is_synthetic" = o."is_synthetic" FROM "organizations" o WHERE o."id" = p."organization_id";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION credentials_no_synthetic_verified() RETURNS trigger AS $$
DECLARE synth boolean;
BEGIN
  IF NEW.status = 'verified' THEN
    IF NEW.organization_id IS NOT NULL THEN
      SELECT is_synthetic INTO synth FROM organizations WHERE id = NEW.organization_id;
    ELSE
      SELECT (p.is_synthetic OR COALESCE(o.is_synthetic, false)) INTO synth
        FROM professionals p LEFT JOIN organizations o ON o.id = p.organization_id
        WHERE p.id = NEW.professional_id;
    END IF;
    IF synth THEN
      RAISE EXCEPTION 'synthetic records cannot hold a verified credential';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- L1: sessions created before staff MFA existed must not skip it.
DELETE FROM "sessions" s USING "users" u WHERE u."id" = s."user_id" AND u."role" IN ('admin', 'reviewer');
