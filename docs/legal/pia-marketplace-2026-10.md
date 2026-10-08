> **Prepared with AI assistance (privacy-legal PIA skill) for review by a UAE-licensed lawyer. Not legal advice.**
> The owner is not a lawyer. Nothing here should be filed with a regulator, or relied on as an opinion, until counsel has reviewed it.
> Citation tags: `[web search — verify]` means taken from search excerpts in `docs/research/legal-due-diligence-2026-10.md`; `[model knowledge — verify]` means recalled, not retrieved; `[repo]` means read from this codebase. No legal-research database was available.

# Privacy Impact Assessment: UAE tax and e-invoicing professional marketplace

**Prepared by:** Claude (AI assistant), for the owner | **Date:** 2026-10-08 | **Status:** DRAFT
**Product owner:** [owner name] | **Privacy reviewer:** [UAE-licensed counsel, to be appointed]

**Prior work:** this is a cold start. No earlier triage or PIA exists in the repo. It builds on the regulatory ledger (`docs/research/stage0-regulatory-ledger.md`) and the October legal update (`docs/research/legal-due-diligence-2026-10.md`).

**House style:** no privacy-legal practice configuration exists, so the skill's default structure is used.

---

## Executive summary

The platform collects business buyers' contact details and needs, and sends them only to the providers the buyer chooses, after explicit consent. It also publishes profiles of tax firms and the named professionals who work there.

The enquiry flow is already built consent-first:
- the consent wording is stored, along with the providers it named;
- data is erased after 12 months, and the buyer can erase it sooner;
- buyer contact details are never put in emails.

The main gaps are elsewhere:
- **(1)** Named professionals are published on the word of their firm. The person has not been asked.
- **(2)** There are no written terms binding providers that receive enquiries.
- **(3)** No transfer safeguards exist yet for hosting and email providers outside the UAE.
- **(4)** Removed people's records are kept with no deletion date.

None of these is hard to fix. All must be fixed before launch.

**Overall risk (proposed, for the reviewer to set):** 🟡 Medium before the conditions below are met; 🟢 Low after.

---

## Step 0: Is a PIA needed?

- **PDPL (Decree-Law 45/2021):**
  - The law contains a data-protection impact assessment duty for processing likely to pose a high risk, including new technology and large-scale processing `[model knowledge — verify: Art. 21]`.
  - The Executive Regulations that would set thresholds are reported as still not issued, as of June 2026 `[web search — verify: Morgan Lewis, Jun 2026]`.
  - So whether the duty is triggered here is **uncertain**.
- **Strong indicators present:**
  - processing users might not expect (named professionals published by their employer);
  - personal data shared with third parties (enquiries to providers);
  - possible transfers outside the UAE.
- **Conclusion:** do the PIA. It is cheap, and it surfaces the launch conditions.
- **DIFC/ADGM:** these regimes would apply only if the operator incorporates there. The legal note advises against that.

---

## 1. Description of processing

| Activity | Data categories (specific fields) `[repo: src/db/schema.ts]` | Data subjects | Purpose | New collection? |
|---|---|---|---|---|
| Enquiry | Contact name, email, optional phone, optional company name, needs-assessment answers (services, emirate, revenue band, staff band, matter type), optional free-text message, hashed IP | Buyer's contact person | Match and pass the enquiry to the providers the buyer selects | Yes |
| Consent record | Wording version, hash of the exact text, purposes, recipient firm IDs, time, hashed IP | Buyer | Prove consent | Yes |
| Provider account | Name, email, password hash, two-factor secret (encrypted), email-verified time | Provider staff | Account and security | Yes |
| Firm profile (public) | Business details; contact details shown only on paid plans | Firms (mostly not personal data); sole practitioners (personal data) | Directory | Yes |
| Named professionals (public) | Full name, title, bio, languages, registration type and number, verification status and date | **Individual tax agents and staff named by their firm** | Show who does the work; individual registrations | Yes |
| Claims and verification | Claimant name and email, evidence notes, reviewer notes | Provider staff | Check that a person may manage a listing or holds a registration | Yes |
| Disputes | Reporter email, details | Members of the public | Correct errors | Yes |
| Analytics | Event names, service, emirate, firm ID, counts; no cookies, no personal identifiers | None, by design | Aggregate counts and provider insights | Yes |
| Security | Hashed IP for rate limits, audit log (actor user ID, action) | All users | Abuse prevention and accountability | Yes |
| Mail outbox | Recipient address and template data; for providers, no buyer contact details | Buyers, provider staff | Notifications | Yes |

---

## 2. Lawful basis (PDPL)

The PDPL is consent-first: processing needs consent unless a listed exception applies, and there is **no legitimate-interests ground** `[web search — verify: Hogan Lovells; DLA Piper]`.

| Purpose | Proposed basis | Notes / gap |
|---|---|---|
| Enquiry matching and sharing with chosen providers | Consent (explicit, specific, naming each recipient) | Built. Wording is `enquiry-v1-draft` and needs counsel approval (RV-M10). Counsel to confirm whether contract performance also applies. |
| Provider account and security | Contract with the provider; security exception | Provider terms are not drafted yet (gap) |
| Publishing named professionals | **Consent of the person** | **Gap.** Only the firm attests today (`listing-v1-draft` is the firm's confirmation, not the person's consent) |
| Verification against official registers | Consent given at submission | Covered by the listing consent text |
| Disputes | Consent (reporter submits voluntarily); legal-claims exception | OK |
| Rate limiting and audit | Security or legal-obligation exceptions | Counsel to confirm which listed exception fits |
| Analytics | Not personal data, as designed | Keep it that way: no user IDs or IPs in events |

---

## 3. Data flow

- **Collection:** web forms, all on our own domain. No third-party scripts, and no cookies apart from the session cookie (httpOnly).
- **Storage:**
  - PostgreSQL. The region is not decided yet; Azure UAE North is recommended (`docs/research/infrastructure-options-2026-10.md`).
  - Two-factor secrets are encrypted with AES-256-GCM; passwords are scrypt-hashed; IPs are stored only as keyed hashes.
- **Access:**
  - Providers see only enquiries sent to them. Every query re-checks the role and organisation.
  - Reviewers do not see buyer contact details; admins do (D-012). There is an audit log, and staff must use two-factor.
- **Sharing:** enquiry details go to the providers the buyer named, who view them inside the platform. Processors (to be contracted): the host, the email provider and the payment provider.
- **Retention** `[repo: src/lib/retention.ts, D-009]`:
  - enquiries: 12 months, or sooner via the buyer's erase link;
  - claims and dispute personal fields: scrubbed after 24 months;
  - sent-mail addresses and data: scrubbed after 90 days;
  - sessions and tokens: deleted when expired;
  - **removed professionals: no limit (gap).**

---

## 4. Privacy notice consistency (`src/app/privacy/page.tsx`, draft)

| Notice commitment | Consistent? | Notes |
|---|---|---|
| "Enquiries … your name, email, optional phone and company, your answers, optional message" | 🟢 | Matches the schema |
| "Provider accounts: name and email of the person managing a listing, and business details" | 🟡 | Doesn't mention **named professionals** shown on public profiles, their registration numbers, or the two-factor secret |
| "Usage counts: anonymous … no cookies" | 🟢 | Events carry firm IDs only. Keep it that way |
| "Security records: one-way hash of IP" | 🟢 | |
| "Shared only with providers you select, after you agree" | 🟢 | Enforced in `src/lib/enquiry.ts` |
| "Enquiries erased after 12 months" | 🟢 | |
| (silent) Claims, disputes, mail retention | 🟡 | Add the 24-month and 90-day periods |
| "Hosting location and processors to be confirmed" | 🟡 | Must name the region and processors before launch, and say whether data leaves the UAE |

---

## 5. Risks and mitigations

| # | Risk (tied to the design) | Likelihood | Impact | Mitigation | Status | Owner |
|---|---|---|---|---|---|---|
| 1 | A firm adds a named employee or former employee, with registration number and bio, to its **public** profile. The person never agreed and may not know. This is publication without the data subject's consent under a consent-first law. | M | M | Before a person is shown publicly, the platform emails them a consent request (or the firm uploads signed consent). Show a person only after consent. They can withdraw at any time. | Gap | Engineering + counsel (wording) |
| 2 | Providers who receive enquiries are not bound by any terms. They may reuse buyer details for unrelated marketing or keep them indefinitely. | M | M | Provider terms making each provider an **independent controller**: purpose limitation, no resale, security, deletion on the buyer's request, breach notice to the platform. Acceptance recorded per version. | Gap | Counsel (draft) + engineering (acceptance record) |
| 3 | Transactional email (recommended: Postmark, US) and any non-UAE backup copy move personal data abroad. No adequacy list exists and no Art. 23 contract is in place. | H (if those vendors are chosen) | M | Sign the vendor DPAs with Art. 23-style clauses; name the transfers in the privacy notice; prefer EU or UAE data locations where offered. | Gap | Owner + counsel |
| 4 | People removed from a firm (soft delete, review2 M5) kept their name and bio indefinitely after any dispute closed. | H | L | `purgeExpiredPersonalData` now scrubs name, title, bio and languages of professionals removed more than 24 months ago with no open dispute (ENG-18). | Done | Engineering |
| 5 | The consent and notice texts are drafts (`-v1-draft`). Consent collected now would not rest on approved wording. | H until launch | M | Pre-launch only. Approve the texts, bump the versions, and record the full text (RV-M10). | Blocked on counsel | Counsel |

**Residual risk after mitigations:** low. What remains is legal uncertainty while the PDPL implementing rules are missing and the regulator is being restructured. Review again when they appear.

---

## 6. Data subject rights

| Right | Can be exercised? | How |
|---|---|---|
| Access | Partly | Buyers: confirmation email and manage link. Others: by request to the contact address (manual). Add a documented response process. |
| Deletion | Yes | Buyers: self-service erase link. Providers and professionals: on request (manual; process to document). |
| Correction | Yes | Providers edit their own profiles; others by request. |
| Portability | Not applicable in practice | By request. |
| Withdraw consent / objection | Yes for enquiries; **gap for named professionals** (see risk 1) | Erase link; professional consent flow to build. |

---

## 7. Recommendation

**CHANGES REQUIRED before launch.** No blocker for private staging, as long as it uses demo or test data only.

**Conditions:**
- [ ] Consent flow for named professionals before public display (risk 1). Owner: engineering. Due before launch.
- [ ] Provider terms with independent-controller clauses, accepted per version (risk 2). Owner: counsel drafts, engineering records acceptance.
- [ ] Vendor DPAs signed with transfer clauses; transfers named in the privacy notice (risk 3). Owner: owner and counsel.
- [x] Retention for removed professionals (risk 4). Done: ENG-18.
- [ ] Approved consent and notice texts; versions bumped (risk 5). Owner: counsel.
- [ ] Privacy notice updated per section 4. Owner: counsel, with an engineering change.
- [ ] Documented process to answer access and deletion requests within the legal time limit (counsel to confirm the period). Owner: owner.

**Sign-off:** [counsel name, date]

---

## Next steps (owner decides)

1. **Build the engineering conditions now** (risks 1 and 4). They are small, and they don't depend on counsel's wording beyond a placeholder text.
2. **Send this PIA and the legal due-diligence note to counsel** as one brief, asking the Q5 questions plus risks 1–3.
3. **Wait** for the PDPL Executive Regulations and AI and Data Authority guidance before launch. Not recommended: there is no date for either.
4. Something else.
