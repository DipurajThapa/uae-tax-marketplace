import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Enums ----------
export const userRole = pgEnum("user_role", ["admin", "reviewer", "provider"]);
export const orgKind = pgEnum("org_kind", [
  "tax_agency", // FTA-registered Tax Agency (regulated)
  "accounting_firm", // accounting/advisory firm, not necessarily a registered Tax Agency
  "einvoicing_provider", // e-invoicing service provider (ASP accreditation is a separate credential)
  "law_firm",
  "independent_consultant",
]);
export const listingStatus = pgEnum("listing_status", ["draft", "published", "suspended", "removed"]);
export const claimState = pgEnum("claim_state", ["unclaimed", "claim_pending", "claimed"]);
export const verificationStatus = pgEnum("verification_status", [
  "unverified", // self-declared / imported, not yet checked
  "pending", // evidence submitted, awaiting reviewer
  "verified", // reviewer checked against official register or document
  "expired", // past expiry or past re-check due date
  "disputed", // an open dispute exists
  "revoked", // reviewer found it invalid / deregistered
]);
export const verificationMethod = pgEnum("verification_method", [
  "official_register",
  "document_review",
  "self_declared",
]);
export const sourceKind = pgEnum("source_kind", [
  "official_register",
  "provider_submission",
  "manual_research",
  "synthetic",
]);
export const reviewState = pgEnum("review_state", ["pending", "approved", "rejected"]);
export const disputeState = pgEnum("dispute_state", ["open", "upheld", "rejected"]);
export const enquiryStatus = pgEnum("enquiry_status", ["received", "routed", "spam", "withdrawn", "erased"]);
export const recipientStatus = pgEnum("recipient_status", [
  "pending",
  "notified",
  "viewed",
  "accepted",
  "declined",
  "closed",
]);
export const notificationStatus = pgEnum("notification_status", ["pending", "sent", "failed", "dead"]);
export const subscriptionStatus = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled"]);
export const chargeStatus = pgEnum("charge_status", ["pending", "invoiced", "waived", "disputed"]);
export const importRowState = pgEnum("import_row_state", ["valid", "invalid", "duplicate", "committed", "skipped"]);
export const articleStatus = pgEnum("article_status", ["draft", "in_review", "published", "archived"]);

// ---------- Provenance ----------
export const dataSources = pgTable("data_sources", {
  id: id(),
  name: text("name").notNull(),
  url: text("url"),
  kind: sourceKind("kind").notNull(),
  // A source may be used for automated import only after its terms/robots were reviewed.
  termsReviewedAt: timestamp("terms_reviewed_at", { withTimezone: true }),
  termsNotes: text("terms_notes"),
  createdAt: createdAt(),
});

// ---------- Taxonomy ----------
export const services = pgTable("services", {
  code: text("code").primaryKey(), // e.g. "corporate-tax-registration"
  name: text("name").notNull(),
  category: text("category").notNull(), // corporate_tax | vat | einvoicing | excise | accounting | advisory
  description: text("description").notNull(),
  // Credential types of which at least one VERIFIED instance is required to be matched for this service.
  requiredCredentialTypes: text("required_credential_types").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const jurisdictions = pgTable("jurisdictions", {
  code: text("code").primaryKey(), // "dubai", "dubai-difc", "abu-dhabi-adgm"
  name: text("name").notNull(),
  emirate: text("emirate").notNull(), // the emirate code it sits in
  kind: text("kind").notNull(), // "emirate" | "free_zone" | "financial_free_zone"
});

export const industries = pgTable("industries", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const credentialTypes = pgTable("credential_types", {
  code: text("code").primaryKey(), // FTA_TAX_AGENCY, FTA_TAX_AGENT, MOF_EINVOICING_ASP, ACCA, ...
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  subject: text("subject").notNull(), // "organization" | "professional"
  regulated: boolean("regulated").notNull().default(false),
  // how many days a verification stays fresh before re-check is due
  recheckDays: integer("recheck_days").notNull().default(90),
  description: text("description").notNull(),
});

// ---------- Providers ----------
export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    slug: text("slug").notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    kind: orgKind("kind").notNull(),
    emirate: text("emirate").notNull(),
    city: text("city"),
    address: text("address"),
    website: text("website"),
    publicEmail: text("public_email"),
    publicPhone: text("public_phone"),
    description: text("description"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    foundedYear: integer("founded_year"),
    sizeBand: text("size_band"), // "1-9" | "10-49" | "50-249" | "250+"
    acceptingEnquiries: boolean("accepting_enquiries").notNull().default(true),
    listingStatus: listingStatus("listing_status").notNull().default("draft"),
    claimState: claimState("claim_state").notNull().default("unclaimed"),
    sourceId: uuid("source_id").references(() => dataSources.id),
    sourceRecordRef: text("source_record_ref"), // id of the record in the source
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    normalizedName: text("normalized_name").notNull(), // for duplicate detection
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organizations_slug_uq").on(t.slug),
    index("organizations_normalized_name_idx").on(t.normalizedName),
    index("organizations_emirate_idx").on(t.emirate),
  ],
);

export const professionals = pgTable(
  "professionals",
  {
    id: id(),
    slug: text("slug").notNull(),
    fullName: text("full_name").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    title: text("title"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    bio: text("bio"),
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("professionals_slug_uq").on(t.slug)],
);

export const credentials = pgTable(
  "credentials",
  {
    id: id(),
    credentialType: text("credential_type")
      .notNull()
      .references(() => credentialTypes.code),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
    registrationNumber: text("registration_number"),
    status: verificationStatus("status").notNull().default("unverified"),
    method: verificationMethod("method").notNull().default("self_declared"),
    evidenceNote: text("evidence_note"), // reviewer note: where/how it was checked
    evidenceUrl: text("evidence_url"), // official register URL or private evidence ref
    sourceId: uuid("source_id").references(() => dataSources.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by"),
    recheckDueAt: timestamp("recheck_due_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("credentials_org_idx").on(t.organizationId),
    index("credentials_status_idx").on(t.status),
  ],
);

export const organizationServices = pgTable(
  "organization_services",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceCode: text("service_code")
      .notNull()
      .references(() => services.code),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.serviceCode] })],
);

export const organizationJurisdictions = pgTable(
  "organization_jurisdictions",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    jurisdictionCode: text("jurisdiction_code")
      .notNull()
      .references(() => jurisdictions.code),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.jurisdictionCode] })],
);

export const organizationIndustries = pgTable(
  "organization_industries",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    industryCode: text("industry_code")
      .notNull()
      .references(() => industries.code),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.industryCode] })],
);

// ---------- Users & auth ----------
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    disabled: boolean("disabled").notNull().default(false),
    // Set when the user proves control of the inbox (verify link, or a set-password link sent there).
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const passwordTokens = pgTable("password_tokens", {
  id: text("id").primaryKey(), // sha256 of the emailed token
  purpose: text("purpose").notNull().default("set_password"), // "set_password" | "verify_email"
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// ---------- Claims, changes, disputes ----------
export const claims = pgTable("claims", {
  id: id(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  claimantName: text("claimant_name").notNull(),
  claimantEmail: text("claimant_email").notNull(),
  claimantRole: text("claimant_role").notNull(),
  evidenceNote: text("evidence_note").notNull(),
  emailDomainMatchesWebsite: boolean("email_domain_matches_website").notNull(),
  state: reviewState("state").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdUserId: uuid("created_user_id").references(() => users.id),
  createdAt: createdAt(),
});

export const credentialSubmissions = pgTable("credential_submissions", {
  id: id(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  submittedBy: uuid("submitted_by")
    .notNull()
    .references(() => users.id),
  credentialType: text("credential_type")
    .notNull()
    .references(() => credentialTypes.code),
  registrationNumber: text("registration_number").notNull(),
  evidenceNote: text("evidence_note").notNull(),
  state: reviewState("state").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  credentialId: uuid("credential_id").references(() => credentials.id),
  createdAt: createdAt(),
});

export const disputes = pgTable("disputes", {
  id: id(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  credentialId: uuid("credential_id").references(() => credentials.id, { onDelete: "set null" }),
  reporterEmail: text("reporter_email").notNull(),
  reason: text("reason").notNull(), // "incorrect_credential" | "incorrect_details" | "business_closed" | "other"
  details: text("details").notNull(),
  state: disputeState("state").notNull().default("open"),
  // credential status before the dispute froze it; restored if the dispute is rejected
  priorCredentialStatus: verificationStatus("prior_credential_status"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  createdAt: createdAt(),
});

// ---------- Demand side ----------
export const consents = pgTable("consents", {
  id: id(),
  textVersion: text("text_version").notNull(),
  textHash: text("text_hash").notNull(),
  purposes: text("purposes").array().notNull(),
  recipientOrganizationIds: uuid("recipient_organization_ids").array().notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  ipHash: text("ip_hash"),
});

export const enquiries = pgTable(
  "enquiries",
  {
    id: id(),
    publicRef: text("public_ref").notNull(), // short reference shown to buyer
    status: enquiryStatus("status").notNull().default("received"),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    companyName: text("company_name"),
    assessment: jsonb("assessment").notNull(), // validated needs-assessment answers
    serviceCodes: text("service_codes").array().notNull(),
    emirate: text("emirate").notNull(),
    message: text("message"),
    consentId: uuid("consent_id")
      .notNull()
      .references(() => consents.id),
    dedupeKey: text("dedupe_key").notNull(),
    manageTokenHash: text("manage_token_hash").notNull(), // buyer's withdraw/erase link (hash only)
    ipHash: text("ip_hash"),
    spamScore: integer("spam_score").notNull().default(0),
    erasedAt: timestamp("erased_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("enquiries_public_ref_uq").on(t.publicRef),
    index("enquiries_dedupe_idx").on(t.dedupeKey, t.createdAt),
    index("enquiries_ip_idx").on(t.ipHash, t.createdAt),
  ],
);

export const enquiryRecipients = pgTable(
  "enquiry_recipients",
  {
    id: id(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    matchScore: integer("match_score").notNull(),
    matchReasons: jsonb("match_reasons").notNull(),
    status: recipientStatus("status").notNull().default("pending"),
    providerNote: text("provider_note"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("enquiry_recipients_uq").on(t.enquiryId, t.organizationId),
    index("enquiry_recipients_org_idx").on(t.organizationId, t.createdAt),
  ],
);

// ---------- Notifications (transactional outbox) ----------
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    channel: text("channel").notNull().default("email"),
    toAddress: text("to_address").notNull(),
    template: text("template").notNull(),
    payload: jsonb("payload").notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    enquiryRecipientId: uuid("enquiry_recipient_id").references(() => enquiryRecipients.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_due_idx").on(t.status, t.nextAttemptAt)],
);

// ---------- Commercial ----------
export const plans = pgTable("plans", {
  code: text("code").primaryKey(), // free | professional | premium
  name: text("name").notNull(),
  // Commercial assumptions (not regulatory facts). Owner sets real prices.
  monthlyPriceAed: integer("monthly_price_aed").notNull(),
  includedLeadsPerMonth: integer("included_leads_per_month").notNull(),
  overageLeadPriceAed: integer("overage_lead_price_aed").notNull(),
  maxLeadsPerMonth: integer("max_leads_per_month").notNull(),
  canPromote: boolean("can_promote").notNull().default(false),
  features: jsonb("features").notNull(),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    status: subscriptionStatus("status").notNull(),
    billingProvider: text("billing_provider").notNull(), // "test" until live billing is authorised
    externalRef: text("external_ref"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("subscriptions_org_idx").on(t.organizationId)],
);

export const leadCharges = pgTable(
  "lead_charges",
  {
    id: id(),
    enquiryRecipientId: uuid("enquiry_recipient_id")
      .notNull()
      .references(() => enquiryRecipients.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    amountAed: numeric("amount_aed", { precision: 10, scale: 2 }).notNull(),
    included: boolean("included").notNull(), // counted against plan allowance (amount 0)
    status: chargeStatus("status").notNull().default("pending"),
    reason: text("reason"),
    periodMonth: text("period_month").notNull(), // YYYY-MM
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("lead_charges_recipient_uq").on(t.enquiryRecipientId)],
);

export const promotions = pgTable("promotions", {
  id: id(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  placement: text("placement").notNull(), // "search" | "service_page" | "location_page"
  serviceCode: text("service_code").references(() => services.code),
  emirate: text("emirate"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- Import pipeline ----------
export const importBatches = pgTable("import_batches", {
  id: id(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => dataSources.id),
  filename: text("filename").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  state: text("state").notNull().default("staged"), // staged | committed | discarded
  createdAt: createdAt(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

export const importRows = pgTable("import_rows", {
  id: id(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => importBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  raw: jsonb("raw").notNull(),
  state: importRowState("state").notNull(),
  errors: jsonb("errors").notNull().default(sql`'[]'::jsonb`),
  duplicateOfOrganizationId: uuid("duplicate_of_organization_id").references(() => organizations.id),
  committedOrganizationId: uuid("committed_organization_id").references(() => organizations.id),
});

// ---------- Content ----------
export const articles = pgTable(
  "articles",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    category: text("category").notNull(),
    // [{title,url,tier,accessedAt}] — every regulatory article must cite at least one official source
    sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`),
    status: articleStatus("status").notNull().default("draft"),
    reviewerName: text("reviewer_name"),
    reviewerCredential: text("reviewer_credential"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("articles_slug_uq").on(t.slug)],
);

// ---------- Analytics & audit ----------
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    name: text("name").notNull(),
    // No personal data. Allowed keys are whitelisted in lib/analytics.ts
    props: jsonb("props").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_events_name_idx").on(t.name, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorUserId: uuid("actor_user_id"),
    actorLabel: text("actor_label").notNull(), // "user:<id>" | "system" | "public"
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);

export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: id(),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("rate_limit_hits_idx").on(t.bucket, t.key, t.createdAt)],
);
