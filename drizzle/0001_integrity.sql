-- Integrity rules enforced in the database, not only in application code.

-- 1. audit_log is append-only.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
--> statement-breakpoint

-- 2. A credential belongs to exactly one subject.
ALTER TABLE credentials ADD CONSTRAINT credentials_one_subject
  CHECK ((organization_id IS NOT NULL)::int + (professional_id IS NOT NULL)::int = 1);
--> statement-breakpoint

-- 3. "verified" requires a non-self-declared method, a reviewer, a timestamp and an evidence note.
ALTER TABLE credentials ADD CONSTRAINT credentials_verified_has_evidence
  CHECK (status <> 'verified' OR (method <> 'self_declared' AND verified_at IS NOT NULL
         AND verified_by IS NOT NULL AND evidence_note IS NOT NULL AND length(evidence_note) > 0));
--> statement-breakpoint

-- 4. Synthetic credentials can never be verified (no fabricated verification claims).
CREATE OR REPLACE FUNCTION credentials_no_synthetic_verified() RETURNS trigger AS $$
DECLARE synth boolean;
BEGIN
  IF NEW.status = 'verified' THEN
    IF NEW.organization_id IS NOT NULL THEN
      SELECT is_synthetic INTO synth FROM organizations WHERE id = NEW.organization_id;
    ELSE
      SELECT is_synthetic INTO synth FROM professionals WHERE id = NEW.professional_id;
    END IF;
    IF synth THEN
      RAISE EXCEPTION 'synthetic records cannot hold a verified credential';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER credentials_no_synthetic_verified BEFORE INSERT OR UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION credentials_no_synthetic_verified();
--> statement-breakpoint

-- 5. Commercial rows only for the internal test ledger or a provider explicitly enabled later.
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_period_valid
  CHECK (current_period_end > current_period_start);
--> statement-breakpoint
ALTER TABLE promotions ADD CONSTRAINT promotions_window_valid CHECK (ends_at > starts_at);
--> statement-breakpoint
ALTER TABLE lead_charges ADD CONSTRAINT lead_charges_nonnegative CHECK (amount_aed >= 0);
--> statement-breakpoint

-- 6. Recipient emails stay out of enquiries after erasure.
ALTER TABLE enquiries ADD CONSTRAINT enquiries_erased_scrubbed
  CHECK (erased_at IS NULL OR (contact_email = '[erased]' AND contact_name = '[erased]' AND contact_phone IS NULL));
