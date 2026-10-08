ALTER TABLE "password_tokens" ADD COLUMN "purpose" text DEFAULT 'set_password' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
-- Accounts that existed before this change were created by staff or through an approved claim; treat them as verified.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
