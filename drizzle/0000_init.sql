CREATE TYPE "public"."article_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('pending', 'invoiced', 'waived', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."claim_state" AS ENUM('unclaimed', 'claim_pending', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."dispute_state" AS ENUM('open', 'upheld', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('received', 'routed', 'spam', 'withdrawn', 'erased');--> statement-breakpoint
CREATE TYPE "public"."import_row_state" AS ENUM('valid', 'invalid', 'duplicate', 'committed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'published', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."org_kind" AS ENUM('tax_agency', 'accounting_firm', 'einvoicing_provider', 'law_firm', 'independent_consultant');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'notified', 'viewed', 'accepted', 'declined', 'closed');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('official_register', 'provider_submission', 'manual_research', 'synthetic');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'reviewer', 'provider');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('official_register', 'document_review', 'self_declared');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'expired', 'disputed', 'revoked');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body_markdown" text NOT NULL,
	"category" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"reviewer_name" text,
	"reviewer_credential" text,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"claimant_name" text NOT NULL,
	"claimant_email" text NOT NULL,
	"claimant_role" text NOT NULL,
	"evidence_note" text NOT NULL,
	"email_domain_matches_website" boolean NOT NULL,
	"state" "review_state" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_version" text NOT NULL,
	"text_hash" text NOT NULL,
	"purposes" text[] NOT NULL,
	"recipient_organization_ids" uuid[] NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "credential_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"credential_type" text NOT NULL,
	"registration_number" text NOT NULL,
	"evidence_note" text NOT NULL,
	"state" "review_state" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"credential_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_types" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"regulated" boolean DEFAULT false NOT NULL,
	"recheck_days" integer DEFAULT 90 NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_type" text NOT NULL,
	"organization_id" uuid,
	"professional_id" uuid,
	"registration_number" text,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"method" "verification_method" DEFAULT 'self_declared' NOT NULL,
	"evidence_note" text,
	"evidence_url" text,
	"source_id" uuid,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"recheck_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"kind" "source_kind" NOT NULL,
	"terms_reviewed_at" timestamp with time zone,
	"terms_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"credential_id" uuid,
	"reporter_email" text NOT NULL,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"state" "dispute_state" DEFAULT 'open' NOT NULL,
	"prior_credential_status" "verification_status",
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_ref" text NOT NULL,
	"status" "enquiry_status" DEFAULT 'received' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"company_name" text,
	"assessment" jsonb NOT NULL,
	"service_codes" text[] NOT NULL,
	"emirate" text NOT NULL,
	"message" text,
	"consent_id" uuid NOT NULL,
	"dedupe_key" text NOT NULL,
	"ip_hash" text,
	"spam_score" integer DEFAULT 0 NOT NULL,
	"erased_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"match_score" integer NOT NULL,
	"match_reasons" jsonb NOT NULL,
	"status" "recipient_status" DEFAULT 'pending' NOT NULL,
	"provider_note" text,
	"notified_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"created_by" uuid NOT NULL,
	"state" text DEFAULT 'staged' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"state" "import_row_state" NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duplicate_of_organization_id" uuid,
	"committed_organization_id" uuid
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emirate" text NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_recipient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount_aed" numeric(10, 2) NOT NULL,
	"included" boolean NOT NULL,
	"status" charge_status DEFAULT 'pending' NOT NULL,
	"reason" text,
	"period_month" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"to_address" text NOT NULL,
	"template" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"enquiry_recipient_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_industries" (
	"organization_id" uuid NOT NULL,
	"industry_code" text NOT NULL,
	CONSTRAINT "organization_industries_organization_id_industry_code_pk" PRIMARY KEY("organization_id","industry_code")
);
--> statement-breakpoint
CREATE TABLE "organization_jurisdictions" (
	"organization_id" uuid NOT NULL,
	"jurisdiction_code" text NOT NULL,
	CONSTRAINT "organization_jurisdictions_organization_id_jurisdiction_code_pk" PRIMARY KEY("organization_id","jurisdiction_code")
);
--> statement-breakpoint
CREATE TABLE "organization_services" (
	"organization_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	CONSTRAINT "organization_services_organization_id_service_code_pk" PRIMARY KEY("organization_id","service_code")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"kind" "org_kind" NOT NULL,
	"emirate" text NOT NULL,
	"city" text,
	"address" text,
	"website" text,
	"public_email" text,
	"public_phone" text,
	"description" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"founded_year" integer,
	"size_band" text,
	"accepting_enquiries" boolean DEFAULT true NOT NULL,
	"listing_status" "listing_status" DEFAULT 'draft' NOT NULL,
	"claim_state" "claim_state" DEFAULT 'unclaimed' NOT NULL,
	"source_id" uuid,
	"source_record_ref" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"normalized_name" text NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"monthly_price_aed" integer NOT NULL,
	"included_leads_per_month" integer NOT NULL,
	"overage_lead_price_aed" integer NOT NULL,
	"max_leads_per_month" integer NOT NULL,
	"can_promote" boolean DEFAULT false NOT NULL,
	"features" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"organization_id" uuid,
	"title" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"bio" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"placement" text NOT NULL,
	"service_code" text,
	"emirate" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"required_credential_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_code" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"billing_provider" text NOT NULL,
	"external_ref" text,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"organization_id" uuid,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_created_user_id_users_id_fk" FOREIGN KEY ("created_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD CONSTRAINT "credential_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD CONSTRAINT "credential_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD CONSTRAINT "credential_submissions_credential_type_credential_types_code_fk" FOREIGN KEY ("credential_type") REFERENCES "public"."credential_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD CONSTRAINT "credential_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_submissions" ADD CONSTRAINT "credential_submissions_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_credential_type_credential_types_code_fk" FOREIGN KEY ("credential_type") REFERENCES "public"."credential_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_consent_id_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_recipients" ADD CONSTRAINT "enquiry_recipients_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_recipients" ADD CONSTRAINT "enquiry_recipients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_duplicate_of_organization_id_organizations_id_fk" FOREIGN KEY ("duplicate_of_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_committed_organization_id_organizations_id_fk" FOREIGN KEY ("committed_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_charges" ADD CONSTRAINT "lead_charges_enquiry_recipient_id_enquiry_recipients_id_fk" FOREIGN KEY ("enquiry_recipient_id") REFERENCES "public"."enquiry_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_charges" ADD CONSTRAINT "lead_charges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_enquiry_recipient_id_enquiry_recipients_id_fk" FOREIGN KEY ("enquiry_recipient_id") REFERENCES "public"."enquiry_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_industries" ADD CONSTRAINT "organization_industries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_industries" ADD CONSTRAINT "organization_industries_industry_code_industries_code_fk" FOREIGN KEY ("industry_code") REFERENCES "public"."industries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_jurisdictions" ADD CONSTRAINT "organization_jurisdictions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_jurisdictions" ADD CONSTRAINT "organization_jurisdictions_jurisdiction_code_jurisdictions_code_fk" FOREIGN KEY ("jurisdiction_code") REFERENCES "public"."jurisdictions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_services" ADD CONSTRAINT "organization_services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_services" ADD CONSTRAINT "organization_services_service_code_services_code_fk" FOREIGN KEY ("service_code") REFERENCES "public"."services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_service_code_services_code_fk" FOREIGN KEY ("service_code") REFERENCES "public"."services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_code_plans_code_fk" FOREIGN KEY ("plan_code") REFERENCES "public"."plans"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_name_idx" ON "analytics_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_uq" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "credentials_org_idx" ON "credentials" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "credentials_status_idx" ON "credentials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiries_public_ref_uq" ON "enquiries" USING btree ("public_ref");--> statement-breakpoint
CREATE INDEX "enquiries_dedupe_idx" ON "enquiries" USING btree ("dedupe_key","created_at");--> statement-breakpoint
CREATE INDEX "enquiries_ip_idx" ON "enquiries" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enquiry_recipients_uq" ON "enquiry_recipients" USING btree ("enquiry_id","organization_id");--> statement-breakpoint
CREATE INDEX "enquiry_recipients_org_idx" ON "enquiry_recipients" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_charges_recipient_uq" ON "lead_charges" USING btree ("enquiry_recipient_id");--> statement-breakpoint
CREATE INDEX "notifications_due_idx" ON "notifications" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_normalized_name_idx" ON "organizations" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "organizations_emirate_idx" ON "organizations" USING btree ("emirate");--> statement-breakpoint
CREATE UNIQUE INDEX "professionals_slug_uq" ON "professionals" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "rate_limit_hits_idx" ON "rate_limit_hits" USING btree ("bucket","key","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");