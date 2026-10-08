# Stage 0 Regulatory & Data Research Ledger

- Prepared: 2026-10-08 (all "accessed" dates below are 2026-10-08)
- Prepared by: Regulatory & Data Research agent (automated research, not legal advice)
- Scope: UAE marketplace for Corporate Tax / VAT / e-invoicing professionals (pre-launch, nothing public)

## IMPORTANT: method limitation (read first)

In this research environment **no page could be opened directly**. Every WebFetch attempt failed with a DNS error (`ENOTFOUND`) and every direct HTTPS request was refused by the session's outbound proxy (HTTP 403 on CONNECT). That covered tax.gov.ae, mof.gov.ae, u.ae, uaelegislation.gov.ae, and also non-government sites such as pwc.com and wafeq.com. The only working tool was a web search engine. It returns titles and URLs, plus summaries and excerpts drawn from the indexed pages.

Consequences:

- **No robots.txt file and no terms-of-use page was read directly.** Statements about terms of use come from search-engine excerpts of the official pages. They must be re-read on the live page before anyone relies on them.
- Labels used in this ledger:
  - **T1-snippet**: the text came from an excerpt of a Tier-1 official URL, and the page itself was not opened. This is better than commentary but is not full verification.
  - **UNVERIFIED**: the point could not be confirmed from any Tier-1 text, including excerpts.
- Confidence ratings are capped at **medium** for anything resting only on T1-snippets. **High** is used only where several independent Tier-1 excerpts agree on a simple fact.
- Re-verification action: rerun this ledger from a network that can reach `*.gov.ae`, `*.ae` and `difc.com` / `adgm.com`, and archive PDF or HTML captures of each cited page.

Tiers: **1** = official (FTA, MoF, UAE Government portal, UAE Legislation, Media Council / NMA, DIFC, ADGM, WAM). **2** = Big-4 firms, international law firms, and regulator-adjacent publications. **3** = commentary, vendor blogs and news.

---

## Decisions this supports

1. **A real public register of FTA tax agents exists, but you may not lawfully bulk-reuse it without FTA written consent.** The FTA publishes a searchable "Registered Tax Agents" web page. Its terms (s.9.2, T1-snippet) prohibit copying, downloading, storing or distributing site content without the FTA's prior written consent. The only exception is non-commercial personal use. **Do not seed the marketplace by scraping or copying the register.** Use it for per-listing verification at onboarding: the agent supplies their TAAN, and a human checks it against the register. Separately, write to the FTA requesting permission or a data feed. (Confidence: medium.)
2. **The credential to model is "listed in the FTA Register of Tax Agents" (TAAN), with both natural-person and juridical-person agents.** Since Cabinet Decision 74 of 2023 (Art. 12(2), effective 1 Dec 2023), firms are listed as *juridical-person tax agents*. Older "Tax Agency" terminology persists on FTA pages. A natural-person agent cannot practise until linked to a firm. Listing lasts 3 years for natural persons and 1 year for juridical persons, so a verification date and re-verification cadence are mandatory. (Confidence: medium.)
3. **There are three distinct regulated categories. Never conflate them in data model or copy:** (a) FTA-listed natural-person tax agent, (b) FTA-listed juridical-person tax agent / "tax agency", (c) MoF-accredited e-invoicing service provider (ASP, a software/Peppol operator, not a tax representative). An ordinary "tax consultant" holds none of these and cannot represent a taxpayer before the FTA. (Confidence: medium-high.)
4. **The MoF ASP list is the best near-term, official, structured source for an e-invoicing vertical.** Demand is time-boxed: businesses with revenue of AED 50m or more must appoint an ASP by **30 Oct 2026** and go live on **1 Jan 2027**. The list is public HTML (plus PDF snapshots) and includes contact fields. Reuse is also restricted ("unauthorised use, reproduction" prohibited). An MoF Open Data Policy exists but has not been confirmed to cover this list. Link to it and verify against it; do not republish it. (Confidence: medium.)
5. **Paid placement or per-lead fees are not shown to be prohibited, but are unverified.** No Tier-1 rule was found that bans a platform from charging tax agents. The FTA Professional Standards (FTA Decision 1 of 2024) penalise agents for winning work "in any unprofessional manner" or with "false promises", so agents themselves carry conduct risk. Label paid placements clearly as "Sponsored". Never imply FTA endorsement, and never call any listing "FTA-approved" unless it was verified against the register on a stated date. Registered agencies "must not promote themselves" as FTA branches (T1-snippet). (Confidence: low-medium; counsel needed.)
6. **Media licensing is unresolved; treat it as a launch blocker for counsel.** Federal Decree-Law 55/2023 says the Competent Authority licenses "electronic and digital media activities that provide ... promotion and advertising". A directory selling promoted listings may fall inside that scope. The regulator has also changed: the National Media Authority (Decree-Law 11/2025) has absorbed the UAE Media Council. (Confidence: low.)
7. **Plan PDPL compliance on a consent-first basis.** Under the PDPL, consent is the default lawful basis and there is no general legitimate-interests ground. Treat named individual agents and enquirers' contact details as personal data. Collect explicit, provable, withdrawable consent at the enquiry form, including consent to share with the selected agents. For cross-border hosting, rely on Art. 23 contractual or consent routes; no adequacy list was found. Whether PDPL Executive Regulations have been issued is **conflicting/UNVERIFIED**. A DIFC- or ADGM-incorporated operator would instead be under DIFC DPL 2020 / ADGM DPR 2021 for processing in that context, and probably still under the PDPL for onshore activity. (Confidence: medium on the structure, low on the regulation status.)
8. **The competitive gap is credential evidence plus matching.** The FTA register has filters but no matching, no reviews, and is not built for comparison. Third-party directories seen (AdvisoryHub, Yellow Pages UAE, Emirae, Wafeq partner directory, firm-run "top 10" lists) show self-asserted "FTA verified" labels or none. (Confidence: medium; based on search-result descriptions only.)

## Open questions for counsel

1. Does FTA website Terms s.9.2 (or any other FTA policy) allow a commercial platform to (a) store TAAN plus name plus status for agents who opted in, (b) deep-link to the register, (c) display "verified against FTA register on [date]"? Should we request written consent or a data-sharing arrangement from the FTA, and through which channel?
2. Is it lawful for a non-licensed platform to state "FTA-registered tax agent" about a third party, given verification on a date? Does the UAE Consumer Protection Law (Federal Law 15/2020) or Federal Decree-Law 14/2023 (e-commerce) apply to B2B listings, and what qualifiers and disclaimers are needed?
3. Does the FTA Professional Standards Guide (FTA Decision 1 of 2024 annex) restrict tax agents from paying referral, per-lead or success-based fees, or from buying sponsored placement? Could participation earn agents black points? We could not obtain the text.
4. Does a B2B professional directory with paid promoted listings require a media or e-media licence under Decree-Law 55/2023, its Executive Regulation (effective 31 Oct 2024) and Cabinet Resolutions 41/42 of 2025? If so, from which authority: the NMA after Decree-Law 11/2025, the emirate DED, or a free-zone authority? Does any staff or influencer promotion require an Advertiser Permit?
5. PDPL: what is the status of the Executive Regulations and of the UAE Data Office? Is a contractual clause enough for hosting outside the UAE? Does sharing an enquiry with three agents make each agent a separate controller?
6. Operator domicile: what are the pros and cons of an onshore mainland, DIFC or ADGM entity for data protection, media licensing and the ability to contract with FTA-listed agents?
7. Does Tax Procedures Decree-Law 28/2022 (or its penalty schedule, Cabinet Decision 129/2025) penalise a person who holds out as a tax agent without listing? If so, does a platform risk aiding that by listing non-registered "tax consultants" next to agents?
8. Is the MoF ASP list covered by the MoF Open Data Policy, or by the copyright page's "unauthorised use, reproduction" prohibition?

---

## Q1. FTA registered tax agents: legal basis, eligibility, public register

### 1a. Legal basis

| Finding | Source(s) | Tier | Confidence |
|---|---|---|---|
| Federal Decree-Law No. 28 of 2022 on Tax Procedures is the primary law. It is effective 1 March 2023 and repealed Federal Law No. 7 of 2017. It defines a Tax Agent as a person registered with the Authority who is appointed to represent another person before it, and refers to "the Register of Tax Agents". Art. 13 delegates the conditions and procedures for registration, suspension and deregistration to the Executive Regulation. | https://tax.gov.ae/DataFolder/Files/Legislation/Federal%20Decree-Law%20No.%2028%20of%202022%20-%20for%20publishing.pdf ; https://uaelegislation.gov.ae/en/legislations/1625/download | 1 (T1-snippet) | medium |
| The Executive Regulation is Cabinet Decision No. 74 of 2023. Art. 12 sets tax agent registration conditions and controls; Art. 13 sets listing and delisting procedures. It applied from 1 Aug 2023, except Art. 12(2) (juridical-person agents), which applied from 1 Dec 2023. | https://tax.gov.ae/Datafolder/Files/Legislation/Cabinet%20Decision%20No.%2074%20of%202023%20on%20Executive%20Regulation%20of%20Federal%20Decree-Law%20No.%2028%20of%202022%20on%20Tax%20Procedures%20-%20For%20Publishing.pdf ; https://uaelegislation.gov.ae/en/legislations/2160/download ; corroboration: https://kpmg.com/ae/en/insights/tax-insights/new-tax-procedures-executive-regulation.html | 1 (T1-snippet) + 2 | medium |
| FTA Decision No. 14 of 2023 sets additional conditions for listing a juridical person as a tax agent under Art. 12(2)(d) of Cabinet Decision 74/2023. Its content was not read. | https://tax.gov.ae/DataFolder/Files/Legislation/Federal-Tax-Authority/FTA%20Decision%20No.%2014%20of%202023%20on%20Additional%20Conditions%20for%20a%20Juridical%20Person%20-%20For%20publishing.pdf | 1 (title only) | medium (existence); content UNVERIFIED |
| FTA Decision No. 1 of 2024 approves the "Professional Standards Guide for Tax Agents" annex and a black-points system. It was issued 15 Jan 2024 and is effective 1 Jul 2024. It replaced the May 2019 Professional Standards guide. | Unofficial translation: https://corporatetaxuae.com/uploads/FTA-Decision-No.-1-of-2024-on-Professional-Standards-for-Tax-Agents-for-publishing.pdf ; https://www.dlapiper.com/en/insights/publications/gulf-tax-insights/2024/gulf-tax-insights-april-2024/fta-issues-decision-professional-standards-for-tax-agents ; https://www.deloitte.com/middle-east/en/services/tax/perspectives/weekly-digest-3june2024.html | 2 / 3 | medium. UNVERIFIED on Tier 1: the FTA-hosted copy was not surfaced |

### 1b. Eligibility: natural person (individual) tax agent

T1-snippet from the FTA pages "Registration Requirements", "How to become a tax agent" and "Tax Agent Registration". The current FTA page cites Cabinet Decision 74/2023 Art. 12.

- Must be a UAE resident.
- Must hold a bachelor's or master's degree in tax, accounting or law from a recognised institution. A degree in another field requires a tax certification from an internationally recognised tax institution.
- Must have at least 3 years of recent relevant experience in tax, law or accounting.
- Must be able to communicate in Arabic and English, with proof. Older guides required both; current wording should be re-checked.
- Must be of good conduct, with no conviction for a crime prejudicial to honour or honesty, and must provide a good-conduct certificate.
- A medical fitness certificate appears on one current FTA list but not on others (UNVERIFIED).
- Must pass the FTA Tax Agent exam. FTA user manuals exist for registration "with exam schedule" and "without exam schedule", so an exam exemption path exists. Its conditions are UNVERIFIED.
- Must have, or be covered by, professional indemnity insurance.
- Fee: AED 3,000. Listing is valid for 36 months (3 years) from first registration or renewal.
- After approval, the applicant receives a TAAN (Tax Agent Approval Number). They **must be appointed or linked by a juridical person or registered tax agency before their status is activated and they can practise**.

Sources (Tier 1, T1-snippet):
- https://tax.gov.ae/en/tax.support/tax.agents/registration.requirements.aspx
- https://tax.gov.ae/en/tax.support/tax.agents/how.to.become.a.tax.agent.aspx
- https://tax.gov.ae/en/services/registration.of.tax.agents.aspx
- https://tax.gov.ae/Datafolder/Files/Pdf/2024/CT%20user%20Manual/CT_TP%20-%20Register%20Natural%20Person%20Tax%20Agent%20with%20Exam%20Schedule%20Tax%20Agent%20User%20Manual%20EN%20V1.2.pdf
- https://tax.gov.ae/-/media/Files/EN/PDF/Guides/Tax-Agent-and-Tax-Agency-User-Guide.pdf (older, pre-2023)

Confidence: **medium**. Exact wording, especially the exam exemption and medical certificate, needs a direct read.

### 1c. Eligibility: Tax Agency / juridical-person tax agent

- Under Cabinet Decision 74/2023 Art. 12(2), in force from 1 Dec 2023, the firm must:
  - be licensed as an audit, tax or law firm;
  - hold, or be covered by, valid professional indemnity insurance;
  - have at least one partner or director who meets the natural-person conditions, supervises the tax services, and does not work for another juridical person.
- The FTA may add conditions, and FTA Decision 14/2023 does so.
- Fee: AED 10,000 for a juridical-person tax agent (T1-snippet, FTA registration page).
- A juridical-person listing lasts **1 year**; a natural-person listing lasts 3 years (Art. 13(8)). If the agent does not renew before expiry, the listing is cancelled and links to all represented taxpayers are revoked (Art. 13(10)).
- Older FTA pages ("Registration of Tax Agency") still describe a "Tax Agency" requiring a trade licence, PI insurance and at least one registered tax agent.

Sources:
- https://tax.gov.ae/en/services/registration.of.tax.agency.aspx (T1-snippet)
- https://tax.gov.ae/en/services/registration.of.tax.agents.aspx (T1-snippet, fees)
- KPMG: https://kpmg.com/ae/en/insights/tax-insights/new-tax-procedures-executive-regulation.html (Tier 2)
- Grant Thornton newsletter, Aug 2023: https://www.grantthornton.ae/contentassets/558d5757902a4efaab6a104fc7a8d86a/gtuae_tax-newsletter_august-2023.pdf (Tier 2)

Confidence: **medium**. The 1-year and 3-year durations rely on Tier 2 sources quoting Art. 13(8) and should be confirmed. **UNVERIFIED:** how pre-2023 "Tax Agencies" were transitioned into juridical-person tax agents.

### 1d. Public register: does it exist, URL, fields, format, update cadence

| Item | Finding | Tier | Confidence |
|---|---|---|---|
| Exists? | **Yes.** The FTA publishes a public "Registered Tax Agents" page, also called the "Authorised Tax Agents Register", where taxpayers can find an agent. | 1 (T1-snippet; FTA news release 17 May 2023) | high (existence) |
| URL | https://tax.gov.ae/en/tax.support/tax.agents/registered.tax.agents.aspx . A newer-style path is also indexed: https://www.tax.gov.ae/en/tax-support/tax-agents/registered-tax-agents . The legacy https://www.tax.gov.ae/registered-tax-agents.aspx returns 404. A separate "Non Registered Tax Agents" page exists: https://tax.gov.ae/en/tax.support/tax.agents/non.registered.tax.agents.aspx (its purpose is UNVERIFIED). | 1 (T1-snippet) | medium (the live URL may have moved) |
| Format | A searchable and filterable HTML web page with keyword search, an Emirate/City filter, and a "Previous Experience" / sector filter ("Filter Agents"). **No PDF, Excel, CSV or API was found.** | 1 (T1-snippet) + 3 | medium |
| Fields | From excerpts and Tier 3 descriptions: agent name, TAAN, business/agency name, location (emirate/city), contact details (email, website, phone), and previous experience or sector classification. **Language is not exposed as a field or filter.** Language is a registration requirement and a "preferred language" input only. | 1 (T1-snippet, partial) + 3 | medium. Exact field set UNVERIFIED |
| Size | One cached snapshot reads "828 items" / "Entries: 12 out of 828" (undated). In May 2023 the FTA reported 454 registered agents, of which 319 were classified by sector. | 1 (T1-snippet; FTA news) | low (current count unknown) |
| Sector classification | The "Tax Agents Classification" initiative launched on 17 May 2023 with 10 sectors (e.g. VAT businesses, Corporate Tax, SMEs/Muwafaq, excise, designated zones, refunds, government/charities, non-residents, real estate). Agents self-select sectors with supporting evidence. Classification does not restrict practice. https://tax.gov.ae/en/media.centre/news/federal.tax.authority.launches.tax.agents.classification.initiative.allowing.taxpayers.to.easily.select.most.compatible.tax.agent.out.of.10.listed.sectors.aspx | 1 (T1-snippet) | medium |
| Update cadence | **Not stated** in any source found. It appears to be a live listing tied to the registration system, but this is UNVERIFIED. | n/a | UNVERIFIED |
| Terms of use / reuse | FTA Terms & Conditions https://tax.gov.ae/en/content/terms.conditions.aspx : s.9.1 says the content is protected by copyright, trade marks, **database rights** and other IP owned by or licensed to the FTA. s.9.2 prohibits downloading, copying, reproducing, transmitting, storing, selling or distributing any content **without the FTA's prior written consent**. There is an exception for downloading or printing for **non-commercial personal** reference, research or information; the excerpt was truncated. The FTA may change the terms without notice. A disclaimer page limits liability for outdated data: https://tax.gov.ae/en/content/disclaimer.aspx | 1 (T1-snippet) | medium |
| robots.txt | **Could not be retrieved** (egress blocked). | n/a | not checked |

**Conclusion on Q1 (reuse):** A lawful public source of real tax-agent records exists for viewing and per-record verification. **No lawful, reusable source for bulk commercial redistribution was found.** Commercial copying, storing or republishing requires the FTA's prior written consent under s.9.2. Exception: a record the agent supplies themselves with consent, then checked against the register, is a different legal footing. That footing is not the FTA's database right, though counsel should confirm (Open Question 1).

---

## Q2. Link to agency, suspension, deregistration, public visibility

| Finding | Source(s) | Tier | Confidence |
|---|---|---|---|
| **Tied to a firm:** a natural-person tax agent may not practise until appointed by, or linked to, a registered tax agency or juridical-person tax agent. FTA linking service page: "the agent must be registered with the FTA and not be linked to any other tax agency", which implies one agency at a time. | https://tax.gov.ae/en/services/registration.of.tax.agents.aspx ; https://tax.gov.ae/en/services/linking.a.tax.agent.to.a.tax.agency.aspx | 1 (T1-snippet) | medium-high |
| **Suspension and deregistration exist in law:** Decree-Law 28/2022 Art. 13 delegates "registration, suspension of registration and deregistration" rules to the Executive Regulation. Cabinet Decision 74/2023 Art. 13 covers listing, continuation, renewal, suspension and cancellation. | Decree-Law 28/2022; Cabinet Decision 74/2023 (URLs above) | 1 (T1-snippet) | medium |
| **Grounds for forced delisting** (Art. 13(13), via commentary): the agent is unable to fulfil duties or no longer meets the conditions; or there are serious grounds that continued listing would harm the integrity of the tax system. The older FTA user guide adds "significant violation of the relevant laws". The full list was not seen. | https://tax.gov.ae/-/media/Files/EN/PDF/Guides/Tax-Agent-and-Tax-Agency-User-Guide.pdf ; https://uae.shushin.io/taxlaw/taxprocedures/executive-regulation | 1 (old guide) + 3 | low-medium |
| **Non-renewal leads to automatic cancellation** and revocation of all taxpayer links (Art. 13(10)). | Grant Thornton Aug 2023 (above) | 2 | medium |
| **Black points** (FTA Decision 1/2024): violations of confidentiality, integrity, objectivity, professional behaviour and competence earn points. Consequences escalate from notification to warning to deregistration. Points can apply to both the individual and the firm. | DLA Piper; Deloitte; Crowe https://www.crowe.com/ae/news/application-of-black-points-system-to-tax-agents | 2 | medium |
| A Tribunal / court decision exists that affirmed termination of a tax agent registration and reduced the suspension period, so suspensions do occur in practice. | https://www.lexology.com/library/detail.aspx?g=32af3ada-b26b-4aed-a4ee-2f8b7c60857a | 2/3 (headline only) | low |
| **Is suspension visible publicly?** **UNVERIFIED.** No Tier-1 statement was found. One Tier 3 source says suspended, cancelled or lapsed agents "simply drop off the list" (https://velmontcrest.ae/insights/fta-registered-tax-agents-uae/). The FTA does not appear to publish a status field or a sanctions list. | Tier 3 only | low |

**Product implication:** absence from the register cannot be distinguished from suspension, expiry or a search mismatch. Store `verified_on` and re-verify on a schedule: at least before each renewal anniversary, and annually for juridical persons. Show "verified on [date]", not "registered". If an agent disappears from the register, remove the badge immediately (fail closed).

---

## Q3. E-invoicing regime and ASPs

### 3a. Legal instruments

| Instrument | Role | Source | Tier | Confidence |
|---|---|---|---|---|
| Federal Decree-Law 16 of 2024 (amends VAT Decree-Law 8/2017) | Adds definitions of electronic invoice and electronic credit note | https://kpmg.com/ae/en/insights/tax-insights/updated-uae-vat-law-no-16-of-2024.html ; WAM https://www.wam.ae/en/article/b5xe3om-mof-amends-federal-decree-law-tax-procedures | 2 / 1 (headline) | medium |
| Federal Decree-Law 17 of 2024 (amends Tax Procedures DL 28/2022) | Defines the "eInvoicing system" and empowers the Minister of Finance to set scope and dates | Same WAM item; EY https://www.ey.com/en_gl/technical/tax-alerts/uae-formally-announces-introduction-of-e-invoicing-launches-e-invoicing-portal-and-amends-vat-law-provisions | 1 (headline) / 2 | medium |
| Ministerial Decision 64 of 2025 | ASP eligibility, pre-approval (Art. 15), accreditation (Art. 16), Central Register for Accreditations, 2-year renewable accreditation | https://mof.gov.ae/wp-content/uploads/2025/03/Ministerial_Decision_Eligibility_and_Accreditation_procedure_for_SPs_EN.pdf | 1 (T1-snippet) | medium |
| Ministerial Resolution 56 of 2026 (10 May 2026) | Amends MD 64/2025: ASPs may use third-party Peppol products and outsource parts of the service, but keep full responsibility | https://mof.gov.ae/wp-content/uploads/2026/05/Ministerial-Resolution-No.-56-of-2026-Amending-Certain-Provisions-of-Ministerial-Resolution-No.-64-of-2025-En-20260510.pdf | 1 (T1-snippet) | medium |
| Ministerial Decision 243 of 2025 | The eInvoicing System framework; B2C is out of scope until further decision | https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-no.-243-of-2025-on-the-Electronic-Invoicing-System.pdf | 1 (T1-snippet) | medium |
| Ministerial Decision 244 of 2025 | Phased implementation timeline | https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-No.-244-of-2025-on-the-Implementation-of-the-Electronic-Invoicing-System.pdf | 1 (T1-snippet) | medium |
| Ministerial Decision 66 of 2026 (14 May 2026) | Amends MD 244/2025: moves the ASP appointment deadline for revenue of AED 50m or more to 30 Oct 2026; go-live of 1 Jan 2027 unchanged | https://mof.gov.ae/wp-content/uploads/2026/05/Ministerial-Resolution-No.-66-of-2026-Amending-Certain-Provisions-of-Ministerial-Resolution-No.-244-of-2025-Regarding-the-Implementation-of-the-Electronic-Invoicing-System-En-20260514.pdf ; https://mof.gov.ae/en/news/ministry-of-finance-announces-targeted-amendments-to-einvoicing-system-decisions/ ; https://www.wam.ae/en/article/c055277-mof-announces-targeted-amendments-einvoicing ; https://www.khaleejtimes.com/business/uae-extends-e-invoicing-service-provider-deadline-to-october-2026 | 1 (T1-snippet, several) + 3 | medium-high |
| Cabinet Resolution 106 of 2025 | Administrative fines, e.g. AED 5,000 per month for failing to implement or appoint an ASP. Dates conflict between 24 Nov and 8 Dec 2025. **The fine amounts are regulatory facts. Do not hard-code them.** | https://mof.gov.ae/en/news/ministry-of-finance-announces-the-issuance-of-cabinet-resolution-on-administrative-fines-related-to-electronic-invoicing-system/ ; https://uaelegislation.gov.ae/en/legislations/3714/download | 1 (T1-snippet) | medium |
| UAE Electronic Invoicing Guidelines V1.1 (1 Jun 2026); Mandatory Fields V1.0 (23 Feb 2026) | Technical guidance. Per Tier 3, V1.1 left the deadlines and the 5-corner model unchanged. | https://mof.gov.ae/wp-content/uploads/2026/06/UAE-Electronic-Invoicing-Guidelines_V-1.1-01June2026.pdf ; https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoice-mandatory-fields_V-1.0-23Feb2026.pdf | 1 (T1-snippet) | medium |

### 3b. Phased dates as of 2026-10-08

| Phase | Appoint ASP by | Mandatory go-live | Confidence |
|---|---|---|---|
| Voluntary pilot / voluntary adoption | n/a | from 1 Jul 2026 | medium |
| Persons with annual revenue of **AED 50m or more** | **30 Oct 2026** (was 31 Jul 2026; amended by MD 66/2026) | **1 Jan 2027** | medium-high |
| Persons with revenue below AED 50m | 31 Mar 2027 | 1 Jul 2027 (one Tier 3 source says 1 Oct 2027; conflicting) | medium |
| Government entities | 31 Mar 2027 (UNVERIFIED) | 1 Oct 2027 | medium |
| B2C | Out of scope until a further Ministerial decision | n/a | medium |

### 3c. The 5-corner model and what an ASP is

MoF description (T1-snippet, eInvoicing programme documents and guidelines):

1. Corner 1, the supplier, submits invoice data to its ASP.
2. Corner 2, the supplier's ASP, validates the data and converts it to UAE PINT AE (Peppol).
3. Corner 2 sends the invoice to Corner 3, the buyer's ASP.
4. In parallel, Corner 2 reports a Tax Data Document to Corner 5, the FTA / tax authority platform.
5. Corner 3 delivers the invoice to Corner 4, the buyer.

An **Accredited Service Provider (ASP)** is a technology service provider accredited by the **Ministry of Finance** under MD 64/2025.

- Eligibility includes active Peppol certification (OpenPeppol conformance), at least 2 years of e-invoicing operation, UAE company registration, information security, insurance, and ISO 22301.
- The provider must offer at least 100 free e-invoice exchanges per year to end users.
- The process has two stages: **pre-approval** (Art. 15), then interoperability and production tests, then **accreditation** (Art. 16, 2 years, renewable).
- A pre-approved provider must stop services if it is not accredited within the MoF timeline.

Sources:
- https://mof.gov.ae/en/services/accreditation-of-einvoicing-service-providers/
- https://mof.gov.ae/wp-content/uploads/2025/03/UAE-eInvoicing-Programme-Feb2025.pdf
- MD 64/2025 (URL above)

Tier 1 (T1-snippet). Confidence: medium.

### 3d. Public ASP list

| Item | Finding | Tier | Confidence |
|---|---|---|---|
| Accredited list (Art. 16) | https://mof.gov.ae/en/about-us/initiatives/einvoicing/einvoicing-accredited-service-providers-asps/ . Alphabetical, "updated periodically to include newly Accredited Service Providers". It also has a sub-table of providers that have completed pre-approval and are in final production assessment. | 1 (T1-snippet) | medium |
| Pre-approved list (Art. 15) | https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/ , plus PDF snapshots https://mof.gov.ae/wp-content/uploads/2025/09/List-and-Contact-Details-of-the-Ministry-of-Finance-Pre.pdf and https://mof.gov.ae/wp-content/uploads/2025/10/Pre-approved-service-providers-page.pdf . Also "updated periodically". | 1 (T1-snippet) | medium |
| Fields | Company name, website, contact person, email, phone. One search summary mentioned accreditation numbers and another did not, so accreditation number is UNVERIFIED. | 1 (T1-snippet, partial) | medium |
| Count | The MoF said 32 providers were approved (10 May 2026 announcement). Excerpts suggest more than 40 entries on the pages now. The exact current count is UNVERIFIED. | 1 + 3 | low |
| Cadence | "Updated periodically". No fixed cadence is stated. | 1 (T1-snippet) | medium |
| Reuse terms | MoF copyright page https://mof.gov.ae/en/copyright/ reserves all rights and prohibits "any unauthorised use, reproduction or printing". An Open Data Policy https://mof.gov.ae/en/open-data-landing/open-data-policy/ offers open data in machine-readable form, but **it was not confirmed to cover the ASP list**. robots.txt was not retrievable. | 1 (T1-snippet) | medium |

### 3e. The regulatory distinction (for product and copy)

| | FTA-listed tax agent (natural person) | FTA-listed tax agent (juridical person) / "Tax Agency" | MoF Accredited Service Provider (ASP) |
|---|---|---|---|
| Regulator | Federal Tax Authority | Federal Tax Authority | Ministry of Finance |
| Legal basis | DL 28/2022; CD 74/2023 Art. 12(1), 13; FTA Dec. 1/2024 | DL 28/2022; CD 74/2023 Art. 12(2); FTA Dec. 14/2023; FTA Dec. 1/2024 | DL 16 and 17/2024; MD 64/2025 (amended by MR 56/2026); MD 243 and 244/2025 |
| What it is | An individual permitted to represent a taxpayer before the FTA | An audit, tax or law firm listed as a tax agent; individual agents practise through it | A Peppol e-invoice exchange and reporting platform operator |
| Identifier | TAAN | TAAN / agency registration | MoF accreditation (Central Register) |
| Term | 3 years | 1 year | 2 years |
| Public list | FTA Registered Tax Agents page | Same page (business name) | MoF ASP and pre-approved pages |
| Can represent a taxpayer before the FTA? | Yes, once linked to a firm | Yes | **No** (not by virtue of ASP status) |

A plain "tax consultant" with none of these statuses may advise but **cannot act as the taxpayer's formal representative before the FTA**. This point is Tier 3 consensus, consistent with the DL 28/2022 definition. Confidence: medium.

---

## Q4. Platform describing "FTA-registered", charging agents, featured placements

| Question | Finding | Source(s) | Tier | Confidence |
|---|---|---|---|---|
| (a) Describing someone as "FTA-registered" | No rule was found that prohibits a third party from accurately stating that a person is listed in the public register. The risk is **accuracy and implied endorsement**: (i) the FTA says registered tax agencies "are not branches of the FTA and must not promote themselves in such capacity"; (ii) consumer-protection rules prohibit misleading claims, including misleading logos, but whether they apply to B2B is UNVERIFIED; (iii) the FTA website's IP terms protect its trade marks, so do not use the FTA logo. Use "Listed in FTA Register of Tax Agents. TAAN [x]. Verified by us on [date]. Not an FTA endorsement." | https://tax.gov.ae/en/services/registration.of.tax.agency.aspx (T1-snippet) ; FTA T&C s.9 ; consumer-protection commentary https://afridi-angell.com/executive-regulations-concerning-the-uae-consumer-protection-law/ | 1 (T1-snippet) + 2 | low-medium |
| Unregistered "tax agents" | Only listed agents may represent taxpayers. No Tier-1 penalty for holding out was found (UNVERIFIED). Tier 3 sources call it an offence. | Tier 3: https://qasproglobal.com/uae-fta-registered-tax-agent-2026/ ; Lexology part I https://www.lexology.com/library/detail.aspx?g=b55c4fd0-4df1-46be-8c36-121eadafe148 | 2/3 | low |
| (b) Per-lead or subscription fees charged to agents | **No Tier-1 prohibition found.** No fee is regulated for tax agent engagements. **Not obtained:** whether the Professional Standards Guide (FTA Dec. 1/2024 annex) restricts agents from paying referral or commission fees. The 2019 standards say an agent must not "obtain or seek to obtain professional work in any unprofessional manner", including "false promises". The Professional Standards Guide may restrict these fees; counsel should check. | 2019 standards (T1-snippet): https://tax.gov.ae/DataFolder/Files/Pdf/Tax%20Agent%20Professional%20Standards%20Guide%20EN%20-%2013%2005%202019.pdf ; DLA Piper / Deloitte (above) | 1 (old, T1-snippet) + 2 | low (UNVERIFIED) |
| (c) Paid "featured" placements | **No Tier-1 rule found** specific to directories. General constraints: misleading-advertising rules (consumer protection, Federal Decree-Law 14/2023 on e-commerce, whose platform-advertising provisions are UNVERIFIED) and the media-licensing question in Q5. Best practice: clearly label placements "Sponsored", keep them separate from match ranking, and use no outcome promises (also consistent with the forbidden-copy list). | E-commerce law commentary: https://www.adsmehub.ae/en/explore/post-details/understanding-the-uaes-new-e-commerce-law | 3 | low |
| Data requests | The FTA has publicly stated it has **not authorised any third party to request financial or accounting data** from registered businesses. Do not imply FTA authority in any intake form. | https://gulfnews.com/business/federal-tax-authority-expresses-concern-over-scam-artists-1.2234737 | 3 (news quoting FTA) | medium |

---

## Q5. Media licensing (Federal Decree-Law 55/2023) for a B2B directory with promoted listings

| Finding | Source(s) | Tier | Confidence |
|---|---|---|---|
| Federal Decree-Law 55 of 2023 Regulating Media covers electronic and digital media. The Competent Authority issues licences "to practise electronic and digital media activities that provide news services or promotion and advertising". The Council issues permits to natural persons who provide advertising content. | https://uaelegislation.gov.ae/en/legislations/2145 ; https://uaemc.gov.ae/en/media-legislation/ ; Advertiser Guide https://uaemc.gov.ae/wp-content/uploads/2025/08/Advertiser-Guide.pdf | 1 (T1-snippet) | medium |
| The Executive Regulation took effect 31 Oct 2024. Cabinet Resolution 41 of 2025 (fees) and 42 of 2025 (content violations and penalties) came into force 16 Apr and 29 May 2025. Penalty ceilings conflict: AED 500k or AED 1m (AED 2m for repeats). | https://uaemc.gov.ae/en/media-legislation/elementor-5360/ ; https://uaelegislation.gov.ae/en/legislations/2868/download ; https://uaelegislation.gov.ae/en/legislations/2869/download ; Clyde & Co https://www.clydeco.com/en/insights/2025/05/uae-media-regulations-framework ; Reed Smith https://viewpoints.reedsmith.com/post/102kcym/uae-unveils-ambitious-overhaul-of-media-regulation | 1 (T1-snippet) + 2 | medium (dates); low (penalty amounts) |
| The Advertiser Permit (Council Decision 3/2025; mandatory from 1 Feb 2026 after an extension) applies to **natural persons** advertising on social media and similar channels, paid or unpaid. It exempts people promoting their own business through their own accounts. It is about individuals, not a platform's own listing product. | Advertiser Guide (above); https://uaemc.gov.ae/en/news/7907/ ; Tier 3: https://www.middleeastbriefing.com/news/uae-influencers-must-obtain-advertiser-permit-under-new-media-law/ | 1 (T1-snippet) + 3 | medium |
| **Regulator change:** a Federal Decree-Law issued 18 Dec 2025, reported as No. 11 of 2025, establishes the **National Media Authority**. It absorbs the UAE Media Council, the National Media Office and WAM, and proposes licensing standards for digital media, publishing and free-zone entities. Whether DL 55/2023 remains in force unchanged is UNVERIFIED. | https://uaelegislation.gov.ae/en/legislations/3943/download ; https://www.wam.ae/en/article/bn9xsue-uae-government-issues-federal-decree-law ; https://gulfnews.com/uae/government/uae-establishes-national-media-authority-to-oversee-media-sector-1.500383718 | 1 (T1-snippet) + 3 | medium |
| **Does it cover a B2B directory with paid promoted listings? UNRESOLVED / conflicting.** Commentary says a licence is needed by "anyone who operates professionally and publicly by disseminating or monetising content". A directory selling promoted listings arguably "provides promotion and advertising" electronically. No source addressed directories or classifieds specifically, and no exemption for them was found. | Lexology https://www.lexology.com/library/detail.aspx?g=674adb3c-61ec-4773-a360-9aba6e56c17d (Tier 2/3) | 2/3 | **low**. UNVERIFIED |

---

## Q6. UAE PDPL (Federal Decree-Law 45/2021)

| Finding | Source(s) | Tier | Confidence |
|---|---|---|---|
| The PDPL is in force from 2 Jan 2022. The UAE Data Office is designated as regulator. | https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws ; https://uaelegislation.gov.ae/en/legislations/1972/download | 1 (T1-snippet) | high |
| **Executive Regulations status: conflicting, UNVERIFIED.** DLA Piper (Tier 2) reported them as not published as of 6 Jan 2025. A 2026 multilaw update and another 2026 guide say they could not locate them on any official source. Several 2026 vendor blogs claim they were issued (citing "Cabinet Decision 33/2024", "111/2023", or an unnumbered 2026 decision) with no gazette reference. **No Tier-1 instrument was found.** | https://www.dlapiperdataprotection.com/countries/uae-general/law.html ; https://www.multilaw.com/Multilaw/Multilaw/Data_Protection_Laws_Guide/DataProtection_Guide_United_Arab_Emirates.aspx ; Tier 3 claims e.g. https://itsecnow.com/regulators/pdpl-executive-regulations-2026 | 2 / 3 | low |
| **Consent:** Art. 4 makes consent the default basis, with listed exceptions (contract performance, legal obligations, legal claims, public interest and others). There is **no general legitimate-interests basis**. Consent must be specific, clear, provable, and withdrawable at any time. B2B enquiry data that identifies a natural person (enquirer name, email, phone; a sole-practitioner agent's profile) is personal data. Lead-sharing with agents needs consent, or a fit with the contract-performance exception, which counsel should assess. | Statute (Tier 1, T1-snippet) + https://www.dlapiperdataprotection.com/countries/uae-general/collection-and-processing.html | 1 + 2 | medium |
| **Cross-border:** Art. 22 permits transfer to jurisdictions with adequate protection, as approved by the Data Office. **No adequacy list was found.** Art. 23 alternatives include a contract imposing PDPL-equivalent obligations, the data subject's express consent (if not contrary to state interests), contract performance, and judicial cooperation. | https://www.pwc.com/m1/en/publications/documents/2024/navigating-cross-border-data-transfers-key-regulations-in-the-middle-east.pdf ; https://abspartners.ae/uae-personal-data-protection-law-2/ | 2 | medium |
| **Free zones:** the PDPL excludes free zones that have their own data protection legislation, which in practice means DIFC and ADGM. A company in a commercial free zone without its own data protection law remains under the PDPL. | Statute Art. 2 (T1-snippet) + PwC (above) | 1 + 2 | medium |
| **DIFC:** DIFC Data Protection Law No. 5 of 2020 (consolidated July 2025) applies to controllers and processors **incorporated in the DIFC**, wherever the processing occurs. It can also reach non-DIFC processors with an ongoing engagement with a DIFC entity. | https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection ; Law PDF on assets.difc.com | 1 (T1-snippet) | medium-high |
| **ADGM:** ADGM Data Protection Regulations 2021 apply to processing "in the context of the activities of an Establishment" in ADGM, wherever processing occurs. Data subject location is irrelevant. | https://www.adgm.com/media/announcements/adgm-enacts-its-new-data-protection-regulations-2021 ; ADGM DPR 2021 Guidance Part 1 | 1 (T1-snippet) | medium-high |
| **Would DIFC/ADGM apply instead?** For processing in the context of a DIFC- or ADGM-established operator, yes. But an operator with onshore UAE activity (e.g. a mainland entity, or staff and processing outside the zone) is likely subject to **both** regimes for different activities (Tier 2/3 consensus). | Tier 2/3 (above) | 2 | medium |

---

## Q7. Competitors and adjacent directories (only those surfaced in search; pages were not opened)

| Name | URL | What it is (per search results) | Observed weakness | Confidence |
|---|---|---|---|---|
| FTA Registered Tax Agents register (official) | https://tax.gov.ae/en/tax.support/tax.agents/registered.tax.agents.aspx | Official search with keyword, emirate and sector/experience filters | No matching, reviews, pricing, availability or language filter. Status (suspended or expired) is not visible. Reuse is restricted. | medium |
| MoF ASP / pre-approved lists (official, e-invoicing) | https://mof.gov.ae/en/about-us/initiatives/einvoicing/einvoicing-accredited-service-providers-asps/ | Flat contact list of ASPs | No comparison of pricing, ERP connectors, sector fit or onboarding capacity | medium |
| AdvisoryHub | https://advisoryhub.ae/corporate-tax-consultants-uae | Directory of tax consultants with emirate filters and an "FTA Verified Directory" label | Inconsistent counts ("200+" vs "Showing 10 of 28"). "Verified" is self-asserted with no evidence shown. | low-medium |
| Yellow Pages UAE: Corporate Tax Consultants | https://www.yellowpages-uae.com/uae/corporate-tax-consultants | Generic business directory category | No credential evidence, no TAAN, no matching | medium |
| Emirae.pro | https://emirae.pro/ | Multi-service "one request, many offers" quote marketplace incl. corporate tax | Generalist. "Verified" consultants with unclear basis. No visible FTA credential evidence. | low-medium |
| UAE Tax Filing | https://uaetaxfiling.ae/ | Matchmaker or managed service routing filings to partner agencies "on the FTA register" | Closed partner network rather than open choice. Claims could not be checked. | low-medium |
| Wafeq accounting partners directory | https://www.wafeq.com/en/accounting-partners/directory/abu-dhabi | Accounting-software vendor's partner directory, plus an FTA tax agent guide | Limited to the vendor's partners. Not tax-agent-credential specific. | low-medium |
| Auditfirms.ae ranked list | https://www.auditfirms.ae/blog/corporate-tax-consultants-dubai | "Top 20" list with contacts | Dated (2024) editorial list. No verification or matching. | medium |
| Firm-authored "Top 10/20" lists (e.g. Farahat, ProAct, Hisab, MyTaxMan) | https://farahatco.com/blog/top-10-corporate-tax-consultants-uae/ ; https://proactfs.com/corporate-tax-consultants-uae/ ; https://hisabca.ae/top-10-corporate-tax-consultants-in-dubai-uae-for-audit/ ; https://mytaxman.ae/top-10-tax-consultants-in-dubai/ | SEO content written by firms that list themselves | Conflicted (self-ranking), no evidence, no matching | medium |

Not found: any marketplace showing TAAN evidence per listing with a verification date, matching by sector, tax type or language, or e-invoicing ASP comparison. This is UNVERIFIED as a negative finding, because search coverage is limited.

---

## Re-verification checklist (before any decision becomes final)

- [ ] Open and archive: FTA Registered Tax Agents page (fields, filters, count, any export), FTA T&C s.9 full text, FTA robots.txt.
- [ ] Open and archive: Cabinet Decision 74/2023 Arts. 12–13 (full text, including suspension), FTA Decision 14/2023, FTA Decision 1/2024 with its annex (fee, advertising and referral provisions).
- [ ] Open and archive: MoF ASP and pre-approved pages (fields, count, date), MoF copyright, Open Data Policy, robots.txt.
- [ ] Confirm MD 66/2026 and the sub-AED 50m dates in MD 244/2025.
- [ ] Confirm NMA decree-law number and effect on DL 55/2023, and the Executive Regulation's definition of licensable electronic media activity.
- [ ] Confirm PDPL Executive Regulation status on uaelegislation.gov.ae and with the UAE Data Office.
- [ ] Any number above (fees, fines, durations, thresholds) must enter the product only as a reviewed Fact record, not as hard-coded text.
