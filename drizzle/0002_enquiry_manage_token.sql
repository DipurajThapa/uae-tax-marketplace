-- Safe on a table with rows (review L9): fill existing rows with an unusable random hash, then require it.
ALTER TABLE "enquiries" ADD COLUMN "manage_token_hash" text NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text);
--> statement-breakpoint
ALTER TABLE "enquiries" ALTER COLUMN "manage_token_hash" DROP DEFAULT;