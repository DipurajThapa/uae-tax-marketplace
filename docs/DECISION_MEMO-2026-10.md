# Decision memo: launch preparation (round 1)

Date: 2026-10-08. For the owner.

This memo answers Q1–Q11 (`docs/OWNER_QUESTIONS.md`) with a recommendation for each. Detail is in:
- `docs/research/legal-due-diligence-2026-10.md`
- `docs/research/infrastructure-options-2026-10.md`
- `docs/research/market-and-pricing-2026-10.md`
- `docs/research/brand-name-options-2026-10.md`
- `docs/legal/pia-marketplace-2026-10.md`

**Read this first.**
- All research was desk research from search-engine excerpts. Official UAE pages could not be opened from this environment (see Q10).
- Every fee, price and legal point is marked with its source and confidence, and must be re-checked on the live page before you rely on it.
- The legal work is research to brief a lawyer. It is not a legal opinion.

---

## Decisions you can make now

| # | Decision | Recommendation | Cost / effort |
|---|---|---|---|
| D1 | Brand | **Taxdar** (تاكسدار); fallback **TaxDaleel** | Domain about AED 50–400 a year; trade mark filing via an agent |
| D2 | Entity | **Dubai mainland (DET) licence**, portal / e-commerce portal activity. Second choice: IFZA or Meydan free zone. **Not DIFC or ADGM.** | First year about AED 25–40k (mainland) or AED 13–30k (free zone), estimates |
| D3 | Hosting | **Azure UAE North**, managed PostgreSQL, plus a backup copy in a second location | About USD 80–130 a month for staging plus production, minimal |
| D4 | Email | **Postmark** (runner-up: Mailgun EU) | About USD 15 a month |
| D5 | Payments | **Stripe (UAE account)**, test mode first | About 2.9% + AED 1 per card payment, plus billing fees (to confirm) |
| D6 | Prices | Free / AED 399 / AED 1,199, with founding-member discount; capacity set by the provider, not the plan | To validate in 10 interviews before switching on billing |
| D7 | Letters | Approve and sign the FTA and MoF letters | None |
| D8 | Counsel | Engage a UAE-licensed lawyer on a fixed-scope brief (section Q1) | Quote needed |
| D9 | Guide reviewer | Approach 2–3 FTA-listed tax agents for a paid review arrangement | Per-guide fee |

---

## Q1. Legal: "use Claude's legal skills, do due diligence"

**Done:**
- legal and regulatory update on all eight counsel questions plus two new ones (outreach, naming);
- a privacy impact assessment using the privacy-legal skill;
- outreach and letters revised to match.

**Main findings:**
- Nothing found makes the business model unlawful.
- **Changed in 2025–2026:**
  - The PDPL regulator is being folded into a new federal AI and Data Authority (June 2026), and the PDPL implementing rules are reported as still not issued.
  - The e-commerce law now has penalties in force (Cabinet Resolution 200/2025). Misleading claims about credentials carry direct risk, and companies count as consumers.
  - The media regulator is now the National Media Authority. No exemption for directories with paid promotion was found.
- **Four points stay launch blockers until a UAE lawyer confirms them in writing:**
  - (1) FTA and MoF register use;
  - (2) whether a media licence is needed for Sponsored listings;
  - (3) the PDPL basis and controller roles for sharing enquiries;
  - (4) entity and licence activity codes.
- **Fifth question:** whether per-enquiry fees are a risk for agents under FTA Decision 1/2024. If counsel objects, switch to subscription-only; that is one setting.
- **PIA result:** changes required before launch, none before private staging. The biggest gap: named professionals are published on their firm's say-so, without their own consent. This is a small engineering fix (build next).

**Why a lawyer is still needed:** an AI cannot give a legal opinion you can rely on, cannot be accountable for it, and here could not even open the official texts. The brief is ready, so their work should be short:
- send the legal due-diligence note (its "what a UAE-licensed lawyer must confirm" lists) plus the PIA;
- ask for written answers to those lists and approval of the consent and notice texts.

Ask for a fixed fee.

## Q2. Entity: "UAE"

- **Recommendation:** Dubai mainland under DET with a portal / e-commerce portal activity, plus any media activity counsel says is needed.
- **Why:**
  - it can sell to onshore firms without a separate permit;
  - one data-protection regime (the PDPL);
  - straightforward banking and Stripe onboarding.
- **Free zone (IFZA, Meydan):** cheaper, and since 2025 a Dubai free-zone company can apply to operate on the mainland. Counsel must confirm whether it would need that permit.
- **DIFC and ADGM:** add a second data-protection regime with private claims (DIFC, from July 2025) and give this business nothing in return.
- **Before choosing:** get the media-licence answer, because the licence must list the media activity. Ask DET and one free zone for written quotes with exact activity codes. The two sources found disagree on the codes.

## Q3. Brand: SEO- and GEO-friendly name

- **Recommendation: Taxdar** (تاكسدار), pronounced "TAX-dar".
  - It contains "tax" for search, and it is a distinctive coined word, so AI assistants and search engines can attach it to one thing.
  - It reads as "tax house" in Arabic and like "radar" in English.
  - Web searches found no company or app with this name.
- **Descriptor:** "Taxdar — UAE tax agent and e-invoicing provider directory". Every page carries: "Independent. Not affiliated with the FTA or the Ministry of Finance."
- **Fallback: TaxDaleel.** Strongest in both languages, but a UAE fintech uses "Daleel", and "دليل" is the word on official FTA and MoF guides.
- **Before buying anything:**
  1. check taxdar.ae and taxdar.com at a registrar (.ae needs a UAE licence holder);
  2. trade-mark agent search (MoE register and WIPO), classes 35 and 42;
  3. DET trade-name check;
  4. a native Arabic speaker's view of the Arabic rendering;
  5. counsel on whether "Tax" may appear in the trade name of a non-agent entity (LG-07).
- **Rejected:** names with UAE, Emirates, Gov, Federal, Authority, Official or FTA (restricted or misleading); Wakeel (a divine name); and names already in use (TaxMatch, Mizan, Daleel and others).

## Q4. Hosting and region

**AWS's UAE region is not usable.** It was physically damaged in March 2026, and AWS said in September that some data held in one zone cannot be recovered. This is confirmed by several news and third-party status sources; the AWS status page itself was not opened. Oracle Dubai's status is unclear. No damage to Microsoft's UAE regions was reported.

- **Recommendation: Azure UAE North:**
  - App Service or Container Apps for the web app and worker;
  - Azure Database for PostgreSQL with point-in-time restore.
- **Lesson from AWS:** keep an encrypted backup copy in a second, independent location. If that location is outside the UAE, it is a cross-border transfer, so counsel must confirm the basis (PIA risk 3).
- **Budget, staging plus production, per month (estimates, to confirm in the Azure calculator):**
  - minimal UAE: USD 80–130 (AED 295–480);
  - resilient UAE: USD 450–550;
  - lean EU alternative (Render, Frankfurt): USD 85–110, but it moves all data to the EU.
- **Suggested ceiling:** USD 150 a month until launch.

## Q5. Payments

- **Recommendation: Stripe**, UAE account.
  - Self-serve onboarding for mainland and free-zone companies; subscriptions with usage-based billing (fits the per-enquiry overage).
  - Test mode, AED payouts, and the customer's VAT number on invoices.
- **Runner-up: Telr** (UAE-native). It has no built-in usage billing, so the app would compute overages itself.
- **Steps:** open the account after the trade licence is issued. Use test mode only until launch approval. Share the keys through the environment's secret settings, never in chat or the repo.

## Q6. Email

- **Recommendation: Postmark.** It does transactional email only, which keeps deliverability high, and has a bounce webhook and a DPA. Data is in the US, so name it in the privacy notice and sign the DPA (PIA risk 3).
- **If you want data kept in the EU: Mailgun EU.** Zoho ZeptoMail may offer UAE storage; one email to Zoho would confirm.
- **Steps:** after the domain is bought, verify the sending domain (SPF, DKIM, DMARC). I'll then wire the provider in (ENG-06).

## Q7. Prices

**Market:**
- 936 FTA-registered tax agents (April 2026); the number of firms is lower and unknown.
- 41 pre-approved e-invoicing providers.
- About 743,000 Corporate Tax and 587,000 VAT registrants.
- No UAE competitor publishes prices or checks credentials against the register.
- Abroad, comparable sites charge about £45–52 per business enquiry (VouchedFor, Unbiased).

**Proposed launch prices (to validate in about 10 provider interviews before billing goes live):**

| Plan | Price | Included enquiries | Extra enquiry |
|---|---|---|---|
| Free | AED 0 | 2 a month | AED 120 (optional) |
| Professional | AED 399 a month | 6 | AED 90 |
| Firm | AED 1,199 a month | 20 | AED 75 |

- **Founding providers (first 30 verified):** 50% off for 12 months, and no charge for a month with no enquiries.
- **Sponsored:** from AED 750 per slot per month, only after the media-licence answer.

**A rule conflict to decide.** Today the plan sets a monthly enquiry cap. A free provider who reaches it drops out of matching while a paying one does not (`src/lib/matching.ts:69`). That breaks the rule that paid status never changes eligibility.

- **Recommendation:** each provider sets its own monthly capacity. Plans change only the price per enquiry and how many are included.
- This is a small change to build once you confirm.

**Demand caveat:** paid search costs several times what an enquiry earns, so demand has to come from search rankings, the guides and partnerships. The brand, the guides and Q9 matter commercially.

## Q8. Letters and outreach

Drafts are ready in `docs/outreach/`:
- the FTA letter (consent to verify one record at a time against the Register of Tax Agents, or an official channel);
- the MoF letter (the ASP list and the Open Data Policy);
- the provider outreach plan, revised after the legal research:
  - emails go only to the generic addresses firms publish (info@), never to a named person, until counsel confirms;
  - each email gives the source of the address and an opt-out, and is sent 07:00–21:00;
  - LinkedIn messages are on hold until counsel confirms;
  - no contact details are ever taken from the FTA or MoF lists.

**Next step:** fill in the company details after D2, sign, and send through each authority's official channel. Nothing goes out without your say-so.

## Q9. Guide reviewer

This can't be Claude. The "Reviewed by" line tells readers that a named, qualified person checked the text and stands behind it, so it must be a real person with a credential (`src/lib/articles.ts` enforces this).

- **What Claude can do:** a pre-review of each draft (sources are official, copy rules pass, nothing states a rate or deadline without a source) to cut the reviewer's time.
- **Suggested profile:**
  - an FTA-listed tax agent (natural person), paid per guide;
  - no listing on the platform during the engagement, or a disclosed conflict;
  - written agreement covering independence and annual re-review.
- **Sourcing:** your network, ACCA, ICAEW or CIMA Middle East members, or one of the firms from the pricing interviews.

## Q10. Network access to `*.gov.ae`

The change hasn't taken effect here:
- the proxy still refuses `tax.gov.ae` (HTTP 403, organisation policy);
- the web fetch tool can't resolve `.ae` names;
- most law-firm sites failed too.

**To fix:** in the environment's settings (the environment menu in the session title bar, then Edit), add these under Allowed domains, keeping the "Allow package managers" box ticked:
- `tax.gov.ae`, `mof.gov.ae`, `u.ae`, `uaelegislation.gov.ae`
- or simply `*.ae`, `difc.com`, `adgm.com`

Then start a new session. I'll re-run the official-source checklist and archive copies of each cited page (RG-01).

## Q11. Private staging (approved)

- **Built:** a staging lock. Every page asks for a username and password, search engines are told not to index, and a missing password shows nothing at all. Tested on a production build.
- **To deploy, you need to:**
  1. create the hosting account (Azure, per Q4) and approve the monthly cost;
  2. add these as environment secrets: `DATABASE_URL`, `APP_SECRET`, `STAGING_BASIC_AUTH`.
- I'll then deploy using the runbook steps (`docs/RUNBOOK.md`, "Private staging") and run the health checks.
- **Staging rules:** demo and test data only, no real enquiries, no real emails to third parties.

---

## Recommended order

1. **This week:**
   - choose the name (domain and trade-mark checks);
   - instruct counsel with the prepared brief;
   - fix the network allowlist;
   - open an Azure account so staging can go up.
2. **Then:**
   - entity licence (after the media answer);
   - sign the FTA and MoF letters;
   - 10 provider pricing interviews.
3. **Engineering meanwhile** (no decisions needed):
   - consent flow for named professionals and retention for removed people (PIA);
   - provider-set capacity once you confirm D6;
   - rebrand the app once D1 is settled.
