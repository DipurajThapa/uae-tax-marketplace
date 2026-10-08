# Legal and regulatory due diligence: update to the Stage 0 ledger (October 2026)

- Prepared: 2026-10-08. All sources accessed 2026-10-08.
- Prepared by: automated research agent. This is research for counsel, **not legal advice**.
- Builds on: `docs/research/stage0-regulatory-ledger.md` ("the ledger"). Read the ledger's method limitation first.

## Summary

1. Nothing found makes the model unlawful in itself. But four points block launch until counsel confirms them in writing: register reuse (Q1), media licensing (Q4), PDPL lead-sharing (Q5) and entity choice (Q6).
2. **Changed since the ledger:** in June 2026 the UAE created a federal **Artificial Intelligence and Data Authority**, which absorbs the UAE Data Office. A June 2026 Morgan Lewis note says the PDPL implementing regulations **have still not been issued**. This moves the ledger's "conflicting" status to "probably not issued" (medium confidence).
3. **Changed:** the e-commerce law (DL 14/2023) now has a penalty schedule, Cabinet Resolution 200 of 2025 (effective 13 Dec 2025, T1-snippet). Misleading platform content now carries a direct penalty risk.
4. **Changed:** the Tax Procedures Law was amended by DL 17/2025 (from 1 Jan 2026), its Executive Regulation by CD 17/2026 (from 1 Apr 2026), and the penalty tables by CD 129/2025 (from 14 Apr 2026). None of the excerpts showed a new rule on tax-agent listing, advertising or referral fees.
5. FTA Decision 1/2024 (black points) is still the conduct code. No 2025–2026 amendment was found. No excerpt showed a rule on referral fees, per-lead fees or paid advertising. Two rules do bind product design: the confidentiality rule (sharing taxpayer information with a third party needs the taxpayer's written consent) and the rule against marketing aggressive tax planning.
6. **New:** the FTA has an Open Data Policy page, and the MoF's Feb 2026 Open Data Usage Guide allows commercial reuse of *open data* with attribution. Neither was shown to cover the tax-agent register or the ASP list, so the ledger's "verify, do not republish" position stands.
7. Media licensing is still the least clear point. The National Media Authority (NMA) replaced the UAE Media Council. No exemption for directories or marketplaces was found. Assume a licence may be needed until counsel or the NMA says otherwise in writing.
8. Entity: a Dubai mainland "Portal" licence (DET) or a commercial free zone are both workable, but **DIFC/ADGM add a second data-protection regime** with little benefit for this model. Since March 2025, Dubai free-zone entities can apply for permits to operate on the mainland.
9. B2B outreach: treat every named business contact as personal data. Under the PDPL, consent comes first and there is no legitimate-interests basis. The TDRA policy requires consent, an unsubscribe link and consent records.
10. Brand: avoid "UAE", "Emirates", "Gov", "Federal", "Ministry", "Authority", "National", "Official" and "FTA" in the trade name, trade mark and domain.

**Method limitation (this run):** WebFetch failed with DNS errors for **every** host tried, not only `*.ae`: dlapiper.com, lexology.com and crowe.com. Every finding below rests on search-engine excerpts. "T1-snippet" marks an official URL whose page was not opened. Tier 2 items are also excerpt-based, so no finding is above **medium** confidence unless several independent sources agree on a simple fact. Dates are given only where a source showed them; "n/d" means no date was visible.

---

## Change log versus the ledger

| # | Change | Effect | Source tier | Confidence |
|---|---|---|---|---|
| C1 | Federal AI and Data Authority approved 14 Jun 2026; merges the UAE Data Office, the AI Office and TDRA's digital-government portfolio | PDPL regulator identity changed; enforcement capacity still unclear | 2 + 3 | medium |
| C2 | PDPL implementing regulations reported as still not issued (June 2026) | Overrides vendor claims of "Cabinet Decision 33/2024", "111/2023" or a 2026 issue | 2 | medium |
| C3 | Cabinet Resolution 200 of 2025: violations and penalties under DL 14/2023 (e-commerce). Issued 27 Nov 2025, effective 13 Dec 2025 per portal excerpt | Platform obligations are now enforceable | 1 (T1-snippet) + 2 | medium |
| C4 | DL 17/2025 amends Tax Procedures DL 28/2022, effective 1 Jan 2026 (OG 809, 14 Oct 2025) | No tax-agent changes seen | 1 (T1-snippet) + 2 | medium |
| C5 | CD 17/2026 amends CD 74/2023, issued 23 Mar 2026, effective 1 Apr 2026 | Procedural (refunds, disclosures, audit); no tax-agent changes seen | 1 (T1-snippet) + 2 | medium |
| C6 | CD 129/2025 amends the penalty tables (CD 40/2017), effective 14 Apr 2026. A tax agent now shares the penalty for failing to facilitate a tax audit | Agents carry more personal penalty exposure | 1 (T1-snippet, consolidated MoF PDF) + 2 | medium |
| C7 | FTA Open Data Policy page found | Possible lawful route for some FTA data; scope unknown | 1 (T1-snippet) | medium (existence) |
| C8 | MoF Open Data Usage Guide (Dec 2024; updated 23 Feb 2026) allows commercial reuse of open data with attribution | Applies only to datasets published as open data | 1 (T1-snippet) | medium |
| C9 | Dubai Executive Council Resolution 11 of 2025 (effective 3 Mar 2025) and the DET "Free Zone Mainland Operating Permit" (announced 8 Oct 2025) | Dubai free-zone entity can apply to operate on the mainland | 2 | medium |
| C10 | DIFC Amendment Law No. 1 of 2025 (in force 15 Jul 2025): private right of action; scope extended to non-DIFC controllers processing data of people who live or work in DIFC | Raises the cost of choosing DIFC | 2 | medium-high |
| C11 | ADGM DPR (Amendment No. 1) 2025: consultation draft only | Enactment UNVERIFIED | 1 (T1-snippet) | low |
| C12 | NMA established by federal decree-law (reported No. 11 of 2025). Press dates it 18 Dec 2025; Lexology says signed 30 Sep 2025, in force Jan 2026 | Regulator for any media licence is now the NMA | 1 (T1-snippet) + 2 + 3 | medium (existence); dates conflict |
| C13 | Ministry of Economy renamed Ministry of Economy and Tourism (20 Jun 2025) | Trade-name and e-commerce enforcement authority name | 3 | low-medium |

---

## Q1. FTA register reuse

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| FTA Terms & Conditions: the FTA may change the terms without notice, and continued use means acceptance. The conduct rules (2.1.9, 2.1.10) bar posting material that infringes IP and **collecting or storing personal information about others**. This excerpt did not show the s.9.2 consent clause the ledger relied on; the ledger's excerpt did. | https://www.tax.gov.ae/en/content/terms.conditions.aspx | 1 (T1-snippet) | n/d | medium |
| The FTA has an **Open Data Policy**. It covers the FTA website's contents; data is shared "freely or under minimal restrictions"; users must credit the FTA with file name and publication date; there is no warranty of continued supply; political, illegal and discriminatory uses are barred. **No excerpt shows the register is published as an open dataset.** | https://tax.gov.ae/en/open.data/opendata.policy.aspx | 1 (T1-snippet) | n/d | medium (policy exists); register coverage UNVERIFIED |
| FTA e-participation consultation on the open data page (geographic data, quarterly releases). | https://tax.gov.ae/en/eparticipation/fta.consultations/41679266-1f87-4c64-8333-33d0407fd9da.aspx | 1 (T1-snippet) | page updated 27 Feb 2024 | medium |
| **No FTA API or bulk download** for the register was found. The register is an HTML search with "Filter Agents" (sector) options. | Gulf News (2023) https://gulfnews.com/business/corporate-tax/uae-fta-classifies-tax-agents-based-on-economic-sector-to-ease-compliance-for-tax-payers-1.1684314912769 | 3 | May 2023 | medium (negative finding) |
| How others handle it: firms self-publish their TAAN (e.g. Rank Consultancy in a Gulf News "GN Focus" piece). Guides tell buyers to check the TAAN on the FTA register themselves. No platform was found that claims an FTA licence or data feed. | https://gulfnews.com/gn-focus/rank-consultancy-now-fta-certified-empowering-uae-businesses-with-trusted-tax-representation-1.500177635 ; https://www.wafeq.com/en-ae/business-hub/for-business/fta-approved | 3 | n/d | low-medium |

### Working position
- Do not scrape, bulk-copy or mirror the register. The project rules already forbid this, and T&C 2.1.10 (collecting or storing personal information about others) adds a second reason.
- Store only what the provider supplies with consent: TAAN, name, firm. A named reviewer checks it one record at a time on the live register. Store `verified_on`, the reviewer and the method.
- Deep-link to the register's home page, not to cached results.
- Do not treat the FTA Open Data Policy as permission until the register appears in an FTA open-data catalogue.
- Write to the FTA (e-participation or customer care) asking for (a) permission to display "verified against the FTA register on [date]" and (b) any data-sharing route. Owner approval is needed before sending, because this is real outreach.

### What a UAE-licensed lawyer must confirm in writing
1. The current full text of FTA T&C s.9 and 2.1.9–2.1.10. Does storing provider-supplied TAANs that a reviewer checked against the register breach them?
2. Does the FTA Open Data Policy cover the register? If not, is a per-record manual check "personal reference" use or commercial use?
3. Is the line "Verified against FTA register on [date]; not an FTA endorsement" acceptable, and is FTA consent needed for it?
4. Which FTA channel to use for a consent or data-sharing request.

---

## Q2. Calling a third party an "FTA-registered tax agent"

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| Consumer Protection Law 15/2020 defines a consumer as **any natural or juristic person** who obtains a good or service. Commentators read this as including companies. The law covers goods and services in the State, **including free zones**, and e-commerce where the supplier is registered in the State. | https://uaelegislation.gov.ae/en/legislations/1455/download ; https://www.mondaq.com/dodd-frank-consumer-protection-act/1736166/consumer-protection-in-uae-law-federal-law-no-15-of-2020 | 1 (T1-snippet) + 2 | n/d | medium |
| Executive Regulation CD 66/2023 (in force 14 Oct 2023) bans unfair terms. Excerpts say it makes a platform supplier responsible for third parties selling through its platform. | https://www.moet.gov.ae/documents/20121/0/CabinetDecision_66_2023_pdf.pdf/01f05bd9-a15b-b353-b297-f834152e1c3a?t=1715053584650 ; https://afridi-angell.com/executive-regulations-concerning-the-uae-consumer-protection-law/ ; Clyde & Co https://www.clydeco.com/en/insights/2023/10/changes-to-the-uae-consumer-protection-law-what-yo | 1 (T1-snippet) + 2 | Oct 2023 | medium |
| The Consumer Protection Law was amended by Federal Decree-Law 5 of 2023. The consolidated text should be used. | https://www.mondaq.com/dodd-frank-consumer-protection-act/1736166/consumer-protection-in-uae-law-federal-law-no-15-of-2020 | 2 | n/d | medium |
| E-commerce DL 14/2023 (in force Sept 2023): a digital trader must not deal in a misleading manner or give incorrect data about the true description of a good or service, and must present services and conditions clearly. Platforms must offer a transparent rating field. Recipients must be able to accept or refuse promotional campaigns. The MoET may block non-compliant platforms. | https://uaelegislation.gov.ae/en/legislations/2150/download ; https://www.moet.gov.ae/documents/20121/0/Federal+Decree-Law+No.+14+of+2023+on+Trading+by+Modern+Technological+Means.pdf ; https://hadefpartners.com/news-insights/insights/digital-platform-compliance-key-considerations-for-uae-platforms/ | 1 (T1-snippet) + 2 | 2023 | medium |
| **CHANGED.** Cabinet Resolution 200 of 2025 schedules violations and penalties under DL 14/2023. Commentary describes a scale from warning to fines (reported up to AED 100,000) and permanent closure. Amounts are regulatory facts; **do not hard-code them**. | https://uaelegislation.gov.ae/en/legislations/3989/regulations ; https://hadefpartners.com/news-insights/insights/digital-commerce-platform-compliance-the-new-penalty-framework-for-uae-platforms/ | 1 (T1-snippet) + 2 | issued 27 Nov 2025; effective 13 Dec 2025 (portal excerpt; other sources differ) | medium (existence); amounts low |
| Media content standards (DL 55/2023 with CR 42/2025, in force 29 May 2025) penalise "misleading or fake content" and breaches of advertising rules. They apply to platforms including those in free zones. | Clyde & Co https://www.clydeco.com/en/insights/2025/05/uae-media-regulations-framework ; Bird & Bird https://www.twobirds.com/en/insights/2025/united-arab-emirates/a-game-enhancer,-not-a-game-changer-key-takeaways-on-the-new-uae-media-law-penalties ; Hadef https://hadefpartners.com/news-insights/insights/key-regulatory-update-uae-media-law-violations-and-administrative-penalties-issued/ | 2 | May 2025 | medium |
| The trade mark law refuses marks that mislead the public about the source of goods or services. The FTA T&C protects FTA trade marks. Do not use the FTA logo. | https://uaelegislation.gov.ae/en/legislations/1535/download ; FTA T&C (above) | 1 (T1-snippet) | 2021 | medium |
| No rule was found that bars a third party from **accurately** stating a public-register fact. | n/a | n/a | n/a | UNVERIFIED (negative finding) |

### Working position
- Treat business buyers as "consumers". Assume DL 14/2023 and CR 200/2025 apply to the platform.
- Use only the factual, dated wording: "Listed in the FTA Register of Tax Agents (TAAN [x]). Checked by [platform] on [date]. Not endorsed by the FTA." Never use "FTA-approved", "FTA-certified", "FTA partner" or the FTA logo.
- Remove the badge as soon as a re-check fails (fail closed). Show the check date on every card and profile.
- Keep the three categories separate in copy: natural-person agent, juridical-person agent, MoF ASP. A non-listed "tax consultant" gets no regulatory badge.
- Keep the transparent ratings field and the complaint route DL 14/2023 requires. The roadmap's review rules already cover this.

### What a UAE-licensed lawyer must confirm in writing
1. Do the Consumer Protection Law and its Executive Regulation apply to a free B2B directory where the business buyer pays nothing? Is the platform a "supplier"?
2. What do CR 200/2025 and CD 66/2023 require of a platform hosting third-party professional listings (identity checks, disclosures, complaints, liability for providers' claims)?
3. Approve or redraft the exact badge and disclaimer text, in English and Arabic.

---

## Q3. FTA Professional Standards (FTA Decision 1/2024) and 2025–2026 updates

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| FTA Decision 1/2024 is still the conduct code: five standards (integrity, objectivity, professional competence, confidentiality, professional behaviour), black points, and escalation from notification to deregistration. Issued 15 Jan 2024; effective 1 Jul 2024. | DLA Piper https://www.dlapiper.com/en/insights/publications/gulf-tax-insights/2024/gulf-tax-insights-april-2024/fta-issues-decision-professional-standards-for-tax-agents ; Deloitte https://www.deloitte.com/middle-east/en/services/tax/perspectives/weekly-digest-3june2024.html ; Crowe https://www.crowe.com/ae/news/application-of-black-points-system-to-tax-agents | 2 | Apr–Jun 2024 | medium-high |
| **No amendment or replacement of Decision 1/2024 was found for 2025–2026.** The 2026 FTA decisions found (6/2026, 13/2026, 17/2026) concern Qualifying Free Zone Persons, input-tax verification and employee expenses. | PwC https://www.pwc.com/m1/en/services/tax/middle-east-tax-news-alerts/2026/fta-decision-no-13-of-2026-on-verification-of-supplies-before-input-tax-deduction.html ; Baker McKenzie https://www.bakermckenzie.com/en/insight/publications/2026/09/united-arab-emirates-fta-introduces-new-input-tax-obligations | 2 | 2026 | medium (negative finding) |
| Confidentiality violation in the annex table: "Sharing information with a third party about any Taxpayer (client or otherwise) without their explicit consent in writing". Reported at 100 points with a 24-month expiry. | Unofficial translation https://corporatetaxuae.com/uploads/FTA-Decision-No.-1-of-2024-on-Professional-Standards-for-Tax-Agents-for-publishing.pdf ; Gulf News https://gulfnews.com/business/corporate-tax/uae-corporate-tax-black-points-to-be-issued-to-tax-agents-for-wrong-advice-from-july-1-1.1714968012824 | 3 (unofficial) | May 2024 | medium |
| Promoting, designing or co-designing "aggressive tax planning" that is marketed is reported at 200 points. The excerpt was truncated. | Gulf News (above) | 3 | May 2024 | low-medium |
| Point thresholds reported for individuals: notification up to 75, first warning up to 149, second warning up to 199, deregistration beyond that. Firm thresholds scale with the number of agents. | Crowe (above) | 2 | n/d | medium. Numbers are regulatory facts; do not hard-code |
| The 2019 guide's integrity rule: an agent must not obtain or seek work "in any unprofessional manner", including false promises or untested assumptions. A conflict that cannot be managed may require withdrawal. | https://tax.gov.ae/DataFolder/Files/Pdf/Tax%20Agent%20Professional%20Standards%20Guide%20EN%20-%2013%2005%202019.pdf | 1 (T1-snippet; 2019 version) | May 2019 | medium |
| **No excerpt showed any rule on referral fees, commissions, per-lead fees, success fees or paid advertising by tax agents.** | All of the above | n/a | n/a | UNVERIFIED |
| In practice, listed agents appear in paid press features (e.g. Gulf News "GN Focus"). No FTA action against agent advertising was found. | Gulf News GN Focus (Q1 table) | 3 | n/d | low |
| CD 129/2025: the penalty for failing to facilitate a tax audit now also applies to the taxpayer's **tax agent**, payable from the agent's own funds. Effective 14 Apr 2026. | https://mof.gov.ae/wp-content/uploads/2025/11/Cabinet-Decision-No.-40-of-2017-and-its-amendments-v14.11.25.pdf ; PwC https://www.pwc.com/m1/en/services/tax/middle-east-tax-news-alerts/2025/use-revised-administrative-penalty-framework-for-violation-of-tax-laws.html | 1 (T1-snippet) + 2 | Nov 2025 | medium |

### Working position
- Subscriptions, per-lead fees and labelled Sponsored placements can proceed in test mode. Commercial terms must not make an agent breach Decision 1/2024:
  - **No success fees or revenue share** linked to a client's tax outcome or refund. This avoids objectivity and "false promise" risk.
  - **No agent duty to report taxpayer details back to the platform** (outcomes, invoices, case studies) without the taxpayer's explicit written consent. This is the confidentiality rule.
  - Profile and Sponsored copy rules ban outcome promises, "aggressive tax planning" claims, and any implied FTA link. This matches the existing copy lint.
- Make lead fees a fee for an introduction, not tied to winning work. Charge the same price for the same lead tier whoever pays more.
- Get the official Arabic and English annex of Decision 1/2024 before live billing.

### What a UAE-licensed lawyer must confirm in writing
1. Does the official annex of FTA Decision 1/2024 contain any violation covering paying for referrals or leads, sharing fees, or advertising? If so, what point value applies?
2. Is a per-lead fee to a platform an "inducement" or "unprofessional manner" of obtaining work?
3. Can listed agents and firms buy labelled Sponsored placement?
4. Has the FTA issued any guidance, circular or FAQ since July 2024 on agent marketing?

---

## Q4. Media licensing for a directory with paid listings

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| DL 55/2023 Art. 12 (per excerpts): the competent authority licenses electronic and digital media activities that provide **news or promotion and advertising, paid or unpaid**. "Media outlet" is defined broadly to include any website or electronic platform. The excerpt showed a carve-out for **federal-entity platforms only**. | https://uaelegislation.gov.ae/en/legislations/2145/download ; https://uaemc.gov.ae/wp-content/uploads/2024/05/Federal-Decree-by-Law-No.-55-of-2023-Concerning-Media-Regulation-EN.pdf | 1 (T1-snippet) | 2023 | medium |
| Executive Regulation CD 68/2024 (in force 31 Oct 2024). The media activities are listed in DL Art. 8 and ER Art. 27. **No exemption for directories, classifieds or marketplaces was found** in any excerpt. | https://uaelegislation.gov.ae/en/legislations/2547/download | 1 (T1-snippet) | 2024 | medium (negative finding) |
| CR 41/2025 (fees) lists more than 100 licences and permits. Excerpts show cinema, film, distribution, games, theatre and printing rows. **No row for a website or directory was seen.** One summary says CR 41 excludes free-zone entities, which stay on a separate fee regime. | https://uaelegislation.gov.ae/en/legislations/2869/download ; Reed Smith https://www.reedsmith.com/our-insights/blogs/viewpoints/102kcym/uae-unveils-ambitious-overhaul-of-media-regulation/ | 1 (T1-snippet) + 2 | 2025 | low-medium |
| CR 42/2025 (violations and penalties) took effect 29 May 2025. It covers 20 content standards and applies to platforms, including in free zones. The penalty ceiling differs by source (AED 500k or AED 1m). | Clyde & Co, Bird & Bird, Hadef (Q2 table) | 2 | May 2025 | medium (scope); low (amounts) |
| NMA decree-law: takes over all functions, rights and obligations of the UAE Media Council, the National Media Office and WAM. Licenses media outlets in traditional, digital and **free-zone** settings. NMA FAQ: it licenses media free-zone entities "in the same manner" as others. | https://uaelegislation.gov.ae/en/news/uae-government-issues-a-federal-decree-law-establishing-and-organising-the-national-media-authority ; https://www.nma.gov.ae/en/faq ; BSA https://bsalaw.com/insight/uae-establishes-national-media-authority/ ; Legal 500 https://www.legal500.com/intelligence/united-arab-emirates/government-public-sector/uae-establishes-national-media-authority | 1 (T1-snippet) + 2 | Dec 2025 | medium |
| No 2026 NMA rule or guidance specific to websites or portals was found. | n/a | n/a | n/a | UNVERIFIED (negative finding) |
| Process: an entity first needs a trade licence that lists the media activity (e.g. "digital publication"), then a licence or permit from the media regulator. One source says a "Cabinet Decision 27 of 2024" sets more than 30 licence categories including digital publishing. **That instrument number is UNVERIFIED.** | Lexology "In brief" https://www.lexology.com/library/detail.aspx?g=6ce714d9-e847-460c-87bb-3426a7144dd6 ; Tamimi https://www.tamimi.com/law-update-articles/media-law-and-advertising-standards-in-the-uae-key-rules-and-restrictions/ | 2 | n/d | low |
| Advertiser Permit: for **natural persons** advertising on digital channels; mandatory from 1 Feb 2026. Applies to any staff member or influencer the platform pays to promote it, not to the platform's listings product. | Middle East Briefing https://www.middleeastbriefing.com/news/uae-influencers-must-obtain-advertiser-permit-under-new-media-law/ ; ledger Q5 | 1 (T1-snippet, ledger) + 3 | 2025–2026 | medium |
| Free-zone activity pages list "Publishing of directories and mailing lists" (ISIC 5812): trade directories, professional registers and B2B databases, in print or digital form. | https://www.meydanfz.ae/activity-hub/how-to-start-a-directories-and-mailing-lists-publishing-business-in-dubai | 1 (T1-snippet; licensing authority's marketing page) | n/d | low-medium |

**Licence category, if one applies:** UNVERIFIED. The most likely candidates are an NMA electronic or digital media licence for a website that "provides promotion and advertising", or a digital or electronic publishing category. Neither could be confirmed for a B2B directory.

### Working position
- Treat a media licence as **possibly required** and keep it as a launch blocker.
- Shape the product to reduce exposure: no editorial news content; Sponsored placements limited to the provider's own verified profile data (no free-form ad creative); no third-party display ads (the project rules already ban ads).
- Do not pay staff or influencers to promote the platform on social media unless they hold an Advertiser Permit.
- Ask the NMA in writing whether the model needs a licence. Owner approval is needed for this outreach.

### What a UAE-licensed lawyer must confirm in writing
1. Is a B2B professional directory with paid, labelled placements a licensable "electronic media activity" under DL 55/2023 Art. 12, ER CD 68/2024 Art. 27 and CR 41/2025? If so, name the exact licence category and fee row.
2. Does the answer change if Sponsored placement shows only verified profile data?
3. Is the NMA the licensing authority for a mainland Dubai entity and for each candidate free zone? Is an emirate-level approval also needed?
4. Do the CR 42/2025 content standards apply to provider-written profile text, and who is liable, the platform or the provider?

---

## Q5. PDPL (Federal Decree-Law 45/2021)

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| **CHANGED.** Morgan Lewis (June 2026): the PDPL implementing regulations "have still not been issued". The UAE Data Office "never became fully operational in practice". | https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data | 2 | Jun 2026 | medium |
| **CHANGED.** A federal **Artificial Intelligence and Data Authority** was approved 14 Jun 2026, chaired by Omar Sultan Al Olama. It merges the AI Office and the UAE Data Office and takes over TDRA's digital-government portfolio. The founding instrument number is UNVERIFIED. | Morgan Lewis (above) ; https://www.globalgovernmentforum.com/uae-creates-dedicated-artificial-intelligence-and-data-authority-to-build-government-of-the-future/ ; https://www.cdomagazine.tech/aiml/uae-launches-unified-ai-and-data-authority-to-power-the-government-of-the-future | 2 + 3 | Jun 2026 | medium |
| Chambers 2026: the PDPL "has yet to be fully operationalised" and enforcement has been limited. | https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/uae/trends-and-developments | 2 | 2026 | medium |
| Vendor claims that regulations were issued (Cabinet Decision 33/2024, 111/2023, or 2026) and of a "1 Jan 2027 compliance deadline" have **no gazette reference**. Treat them as UNVERIFIED. | e.g. https://itsecnow.com/regulators/pdpl-executive-regulations-2026 ; https://binaryminds.ae/blog/uae-pdpl-compliance-checklist-2027 | 3 | 2026 | low |
| Consent first: Art. 4 bans processing without consent unless a listed exception applies. There is **no legitimate-interests basis**. Art. 4 lets the Executive Regulation add more cases, but it has not been issued. | Hogan Lovells https://www.engage.hoganlovells.com/knowledgeservices/news/getting-personal-uae-data-protection-landscape ; DLA Piper https://www.dlapiperdataprotection.com/countries/uae-general/law.html | 2 | n/d | medium |
| Cross-border: Art. 22 covers adequacy approved by the Data Office; **no adequacy list has been published and no standard contractual clauses have been issued**. Art. 23 alternatives: contract imposing PDPL-level protection, express consent, contract performance, and others. The PDPL does not require in-country hosting. | Kayrouz & Associates https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026 ; Middle East Briefing https://www.middleeastbriefing.com/news/uae-data-protection-obligations-and-cross-border-data-transfer-for-businesses/ | 2/3 | 2026 | medium |
| Controller and processor are defined in Art. 1 (who decides purposes and means, versus who processes on behalf). **No UAE source addressed joint controllers or lead sharing.** | https://docs.modulos.ai/frameworks/uae-pdpl/controllers-processors-and-the-dpo | 3 | n/d | low |
| **DIFC DPL 2020, amended by DIFC Amendment Law No. 1 of 2025 (in force 15 Jul 2025):** private right of action (reported Art. 64A); scope extended to non-DIFC controllers and processors handling data of people who live or work in DIFC; documented adequacy assessments for transfers. | Bird & Bird https://www.twobirds.com/en/insights/2025/united-arab-emirates/difc-enacts-amendments-to-data-protection-law ; Kennedys https://www.kennedyslaw.com/en/thought-leadership/article/2025/the-dubai-international-financial-centre-amends-the-data-protection-law | 2 | Jul 2025 | medium-high |
| **ADGM DPR 2021:** GDPR-aligned; covers processing in the context of an ADGM establishment. Draft Amendment No. 1 of 2025 (Consultation Paper 6/2025) adds Board rule-making power under s.7(2)(k); enactment UNVERIFIED. A data-protection fee (reported USD 300) applies at registration and renewal. | https://assets.adgm.com/download/assets/Annex+A+-+Data+Protection+Regulations+%28Amendment+No.+1%29+2025.pdf/0f00b45044fb11f0bc64ae8b4ea0a7bb ; https://investment-international.com/News/adgm-cuts-licence-fees-for-non-financials-but-others-see-hike/ | 1 (T1-snippet) + 3 | 2025 | low-medium |

**Comparison**

| | PDPL (onshore and commercial free zones) | DIFC DPL 2020 (amended 2025) | ADGM DPR 2021 |
|---|---|---|---|
| Lawful bases | Consent first; listed exceptions; no legitimate interests | GDPR-style, including legitimate interests | GDPR-style, including legitimate interests |
| Regulator | UAE Data Office, now inside the AI and Data Authority; not fully operational | Commissioner of Data Protection (active) | Office of Data Protection (active) |
| Implementing rules | Not issued (medium) | Regulations in force | In force |
| Transfers | Adequacy (no list) or Art. 23 routes | Adequacy plus documented assessments | Adequacy (follows EU decisions), SCCs, BCRs |
| Private claims | No specific route found | Yes, from Jul 2025 | UNVERIFIED |
| Fees | None found | Annual notification fee (amount UNVERIFIED) | Data-protection fee (reported USD 300) |

### Working position
- Build to the strictest overlap: explicit, separate, versioned consent at the enquiry form, naming each selected provider, already implemented. Consent withdrawal and erasure flows stay on.
- Treat each provider who receives an enquiry as an **independent controller** for its own follow-up. The platform is a controller for matching and routing. Put this in provider terms: purpose limitation, no resale, security, deletion on request, breach notice to the platform.
- Hosting: prefer a UAE region. If hosted abroad, use an Art. 23 contract with the host and get express consent in the privacy notice, as a belt-and-braces measure.
- Do not depend on any PDPL Executive Regulation text. Monitor the AI and Data Authority.

### What a UAE-licensed lawyer must confirm in writing
1. Have the PDPL Executive Regulations been issued, as of the date of advice? Which body now enforces the PDPL?
2. For sharing an enquiry with up to 3 providers: is consent the right basis, or contract performance? Is each provider an independent controller, a joint controller or a processor?
3. Is a hosting contract under Art. 23 enough for non-UAE hosting, or is express consent also needed?
4. If the operator is in DIFC or ADGM, which regime governs enquiries from onshore buyers, and do both apply?

---

## Q6. Operator entity

### Findings

| Option | Licence activity (as found) | Typical first-year cost (indicative, Tier 3) | Contracting with onshore agents | Data regime | Source / tier / confidence |
|---|---|---|---|---|---|
| Dubai mainland (DET) | "Portal" licence (connects buyers and sellers; open to foreign owners). Activity code reported as **4791010 "E-Commerce Portal Activities"**; another source gives 4791001 "E-commerce via online markets". **Codes conflict: UNVERIFIED.** | Reported AED 15,000 start; AED 25,000–40,000 all-in | Unrestricted onshore | PDPL | https://www.aaconsultancy.ae/dubai/ecommerce-company-formation/ ; https://virtuzone.com/blog/ded-activity-list/ ; 3; low-medium |
| Dubai CommerCity (free zone) | E-commerce licence (goods and services online); ISIC 4-based list of more than 1,500 activities; dual licence with DET available | Licence-only AED 9,000–20,000; packages AED 18,000–62,000 (sources vary) | Dubai mainland permit route (see below) | PDPL | https://www.bayut.com/mybayut/dubai-commercity ; https://mazeed.com/blog/ecommerce-license-dubai-cost/ ; 3; low |
| IFZA (free zone) | E-commerce licence (online store or digital services); more than 1,500 activities; 5–7 per licence | Base about AED 12,500–13,000 (no visa); AED 25,000–30,000 with one visa | Mainland permit route | PDPL | https://ifza.com/en/commercial-licence/e-commerce-license-dubai/ (T1-snippet, authority site) ; https://osome.com/ae/blog/ifza-company-costs/ ; 1/3; low-medium |
| Meydan (free zone) | "Publishing of directories and mailing lists" (5812), "Other publishing" (5819) | Not found | Mainland permit route | PDPL | meydanfz.ae activity pages (T1-snippet); low-medium |
| DMCC (free zone) | E-commerce packages (DMCC's own undated terms document) | AED 30,000–60,000 | Mainland permit route | PDPL | https://www.dmcc.ae/download_file/8238/0 (T1-snippet) ; https://uaefreezonefinder.com/dmcc/ ; 1/3; low |
| DIFC | Innovation licence (software, IT; excludes financial services and physical goods). Reported USD 1,500 a year, subsidised, plus a mandatory DIFC desk | USD 15,000–50,000 (one blog) | **DIFC entities are excluded from Dubai ECR 11/2025** mainland permits | DIFC DPL (plus PDPL onshore, probably) | Al Tamimi via https://arnifi.com/blog/difc-innovation-license/ ; BSA https://www.bsalaw.com/insight/difc-ai-and-innovation-licences-what-founders-need-to-know ; 2/3; low-medium |
| ADGM | Tech start-up licence (own IP); USD 1,500 a year from 1 Jan 2025 plus USD 300 data-protection fee | UNVERIFIED | Abu Dhabi rules; not researched | ADGM DPR | https://investment-international.com/News/adgm-cuts-licence-fees-for-non-financials-but-others-see-hike/ ; 3; low |

Other findings:
- **CHANGED.** Dubai Executive Council Resolution 11 of 2025 (effective 3 Mar 2025) lets Dubai free-zone entities, **except DIFC financial entities**, operate on the mainland through a branch licence, a dual licence or a temporary permit (up to 6 months). DET will publish the list of eligible activities. On 8 Oct 2025 DET announced a "Free Zone Mainland Operating Permit" through Invest in Dubai. Fees reported differ (AED 5,000 per 6 months or per year). Sources: KPMG https://kpmg.com/ae/en/insights/tax-insights/dubai-issues-resolution-enabling-free-zone-companies-to-operate-on-mainland.html ; Reed Smith https://www.reedsmith.com/our-insights/blogs/viewpoints/102l0qt/new-era-for-free-zone-mainland-integration-dubais-executive-council-resolution/ ; Afridi & Angell https://afridi-angell.com/dubai-executive-council-resolution-no-11-of-2025-expanding-free-zone-opportunities/ (Tier 2, 2025–Feb 2026; medium).
- The platform sells a service (subscriptions and leads) to onshore agents and markets to onshore businesses. Whether a free-zone entity needs the mainland permit for this, when it has no physical presence onshore, is **UNVERIFIED**.
- Some sources say mainland e-commerce licences need TDRA approval; others say only for regulated sectors. **Conflicting: UNVERIFIED.**

### Working position
- **Prefer a Dubai mainland DET licence** with a portal or e-commerce portal activity, plus any media activity counsel requires. Second choice: a Dubai commercial free zone (IFZA, Meydan or CommerCity) with a directory or portal activity, plus a mainland operating permit if counsel requires one.
- **Avoid DIFC and ADGM for this model.** They add a second data regime, a mandatory desk in DIFC, the DIFC private right of action, and DIFC's exclusion from the Dubai mainland permit. They offer nothing the business needs.
- Make the choice only after the Q4 media answer, because the trade licence must list the media activity.
- Get written quotes and the exact activity codes from DET and two free zones. Owner decision.

### What a UAE-licensed lawyer must confirm in writing
1. Which exact activity codes cover (a) a B2B professional directory, (b) matching and lead routing, (c) paid placements? On which register (DET, IFZA, Meydan, CommerCity)?
2. Can a free-zone entity sell subscriptions and leads to onshore agents and market to onshore buyers without a mainland permit?
3. Is TDRA approval needed for the online activity?
4. What are the corporate tax and VAT points of each option (registration, qualifying-income status)?

---

## Q7. Tax Procedures: practising without listing, and platform "aiding" risk

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| DL 28/2022 defines a tax agent as a person listed in the FTA register and appointed to represent another before the FTA. The Executive Regulation (CD 74/2023 Arts. 12–13) sets listing rules. | Ledger Q1a | 1 (T1-snippet) | 2022–2023 | medium |
| **CHANGED.** DL 17/2025 (effective 1 Jan 2026) and CD 17/2026 (effective 1 Apr 2026) amend these. Excerpts cover refunds, the 5-year credit window, audit periods (up to 15 years in some cases), binding FTA directives, voluntary disclosure and data sharing. **No tax-agent provision was seen.** | MoF https://mof.gov.ae/en/news/ministry-of-finance-announces-amendments-to-tax-procedures-executive-regulations-effective-april-2026/ ; https://mof.gov.ae/en/news/ministry-of-finance-to-implement-amendments-to-the-tax-procedures-law-starting-early-2026/ ; PwC https://www.pwc.com/m1/en/services/tax/middle-east-tax-news-alerts/2026/uae-tax-procedures-law-executive-regulations-amendments.html ; DLA Piper https://www.dlapiper.com/en/insights/publications/gulf-tax-insights/2025/gulf-tax-insights-december-2025/uae-tax-procedures-law-changes-as-per-1-january-2026 ; BDO https://www.bdo.ae/en-gb/news/news/cabinet-decision-no-17-of-2026-%E2%80%93-amendment-to-the-tax-procedures-executive-regulations-issued-on | 1 (T1-snippet) + 2 | Oct 2025–Apr 2026 | medium |
| **CHANGED.** CD 129/2025 (amending CD 40/2017; published 10 Nov 2025; effective 14 Apr 2026) applies the audit-facilitation penalty to the taxpayer's tax agent or legal representative. No item for "practising as a tax agent without listing" was seen. | MoF consolidated PDF (Q3) ; https://tax.gov.ae/Datafolder/Files/Legislation/2025/Cabinet%20Decision%20No.%2040%20of%202017%20and%20its%20amendments%20-%20publishing%2011%202025.pdf ; Habib Al Mulla https://habibalmulla.com/articles/administrative-penalties-in-the-uae-the-2025-reform-and-the-shift-toward-a-unified-tax-penalty-regime/ | 1 (T1-snippet) + 2 | Nov 2025 | medium |
| News at launch: "no individual may practise as a tax agent" without FTA registration and accreditation and a licence from competent authorities. | Khaleej Times https://www.khaleejtimes.com/business/personal-finance/registration-open-for-tax-agents-tax-accounting-software-vendors-in-uae | 3 | n/d (launch-era report) | medium (prohibition); penalty UNVERIFIED |
| **No administrative penalty, criminal offence or "aiding" provision for holding out as a tax agent was found** in DL 28/2022, the penalty tables or the Penal Code excerpts. | n/a | n/a | n/a | UNVERIFIED |
| The legal responsibility for tax stays with the taxpayer whatever agent is used. | Tally (vendor) https://tallysolutions.com/mena/uae-vat/tax-agent-uae/ | 3 | n/d | low-medium |

### Working position
- Only FTA-listed agents (natural or juridical person) may appear under "tax agent" or "can represent you before the FTA". Unlisted firms may be listed only as "tax advisory / accounting firm (not an FTA-listed tax agent)", in a visibly separate category, and are never matched for representation needs.
- In the needs assessment, if the buyer needs representation before the FTA (registration, reconsideration, audit), match only listed agents.
- Ban copy such as "tax agent" or "FTA agent" in an unlisted provider's profile. This is enforceable through copy lint and moderation.
- Remove the badge and re-route open leads if a listed agent's re-check fails.

### What a UAE-licensed lawyer must confirm in writing
1. Is holding out as a tax agent without listing an administrative violation (and under which item) or a criminal offence (Penal Code impersonation or professional-title provisions)?
2. Could a platform that lists unlisted advisers, or routes representation work to them, be liable as a participant?
3. Is "tax adviser / tax consultant" a protected title for unlisted firms? What do their trade licences let them do?

---

## Q8. MoF ASP list reuse and open data

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| MoF Open Data Usage Guide: users may "copy, reproduce, and communicate" and "adapt or modify the data for both commercial and non-commercial purposes". Conditions: attribute the MoF and link where feasible; no political or illegal use; do not publish others' IP; "refrain from using personal data"; data is "as is"; rights end on breach. | https://mof.gov.ae/wp-content/uploads/2024/12/Open-Data-Usage-Guide-Eng-Updated.pdf ; https://mof.gov.ae/wp-content/uploads/2026/02/Open-Data-Usage-Guide-english_23.2.26.pdf ; https://mof.gov.ae/wp-content/uploads/2024/01/MoF_How-to-Use-Open-Data-for-Budget-Execution.pdf | 1 (T1-snippet) | Dec 2024; 23 Feb 2026 | medium |
| The commercial-use clause of the Feb 2026 version was **not visible**. The 2024 how-to guides show it. | Same | 1 (T1-snippet) | 2026 | low-medium |
| **No excerpt shows the ASP list or the pre-approved list in the MoF open-data catalogue.** The list pages are under "Initiatives > eInvoicing", not "Open Data". The MoF copyright page reserves all rights. | Ledger Q3d ; https://mof.gov.ae/en/copyright/ | 1 (T1-snippet) | n/d | medium |
| The open-data guide says to avoid personal data. The ASP list includes **named contact persons, emails and phones**, which is personal data under the PDPL. | Guide (above) ; ledger Q3d | 1 (T1-snippet) | n/d | medium |

### Working position
- No change: do not republish or import the ASP list. Link to the MoF pages. Verify each ASP that self-lists, one at a time, against the live list, and store `verified_on`.
- Never copy contact-person names, emails or phones from the MoF list into the platform or into outreach. This is PDPL personal data, and the open-data guide itself says to avoid personal data.
- If the MoF later publishes the list as a dataset, re-assess under the Open Data licence (attribution, no personal data).

### What a UAE-licensed lawyer must confirm in writing
1. Is the ASP or pre-approved list "open data" under the MoF policy, or only under the copyright page?
2. Can company names and accreditation status (no personal contacts) be shown with attribution and a "verified on" date?
3. Should the platform ask the MoF eInvoicing team for written permission?

---

## Q9 (new). Anti-spam and electronic marketing for B2B outreach

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| TDRA Regulatory Policy on Unsolicited Electronic Communications v1.1. Spam is marketing electronic communications sent without the recipient's **consent**. The "UAE link" test is broad (sent from or received in the UAE, or by a UAE person). Obligations are placed on **telecom licensees**, which must minimise spam and act on complaints. | https://tdra.gov.ae/-/media/About/regulations-and-ruling/EN/Unsolicited-Elrctronic-Commuincations--pdf.ashx ; https://tdra.gov.ae/-/media/About/regulations-and-ruling/EN/cellular-phone-spam-regulatory-policy-English.ashx | 1 (T1-snippet) | 13 Jun 2022 | medium |
| TDRA FAQ: get consent from all recipients before sending marketing messages; give a free unsubscribe; keep consent records; avoid sending 21:00–07:00 UAE time. Escalation by service providers: warning, then suspension, then disconnection. | https://tdra.gov.ae/en/FAQs | 1 (T1-snippet) | n/d | medium |
| Telemarketing: Cabinet Resolution 56 of 2024 (obligations) and 57 of 2024 (penalties). Covers calls, marketing SMS and marketing messages on social apps; requires prior approval, the Do Not Call Register and calling hours. **Email not covered as far as found.** Applies to free-zone companies too. | Clyde & Co https://www.clydeco.com/zh/insights/2024/07/uae-tightens-telemarketing-regulations-what-you-ne ; Al Tamimi https://tamimi.com/news/new-uae-telemarketing-regulations-what-you-need-to-know | 2 | Jul 2024 | medium |
| PDPL: direct marketing by call, email or text needs prior consent, and "no alternative legal basis" exists even with an existing relationship. Commentary focuses on consumers; **no source addresses named B2B contacts**. | Baker McKenzie https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/uae/topics/cookies-online-tracking-and-direct-marketing ; Mondaq https://www.mondaq.com/compliance/1229090/compliance-%7c%7c-communications-with-customers | 2 | n/d | medium (consumer); B2B UNVERIFIED |
| DL 14/2023: recipients must have the option to accept or refuse promotional campaigns by email or social media. | Q2 table | 1 (T1-snippet) | 2023 | medium |
| DIFC: Commissioner guidance says "soft opt-in" is not permitted in the UAE generally and pre-ticked boxes are not allowed. Prior opt-in for email marketing; unsubscribe link required. | CMS https://cms.law/en/are/legal-updates/DIFC-Commission-of-Data-Protection-issues-DIFC-Data-Protection-Policy-Guidance ; Baker McKenzie DIFC https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/dubai-international-financial-center/topics/cookies-online-tracking-and-direct-marketing | 2 | n/d | medium |
| ADGM direct-marketing rules: **not found**. | n/a | n/a | n/a | UNVERIFIED |
| Claims that cold email is "illegal" or carries fines up to AED 5m are unsupported. | e.g. https://thebuzihub.com/page/65/email-marketing-compliance-gcc | 3 | n/d | low |

### Working position (provider recruitment emails)
- Real outreach needs owner approval under project rules. When approved:
  - **No cold marketing email to named individuals** (including sole-practitioner agents) without consent.
  - Do not source addresses from the FTA register or the MoF list. Their terms and PDPL forbid it.
  - Allowed first contact: one-to-one, non-bulk messages to a firm's **generic role address** (e.g. info@) that the firm publishes on its own website. The message identifies the sender, states the purpose and where the address came from, gives a one-click opt-out, and goes out between 07:00 and 21:00 UAE time. Counsel must confirm this.
  - Better route: inbound sign-up (provider self-listing) and partnerships with professional bodies.
- No telemarketing or WhatsApp outreach until counsel confirms CR 56/2024 applies or not, and TDRA approval is obtained if needed.
- Keep consent and suppression records, and honour opt-outs across all channels.

### What a UAE-licensed lawyer must confirm in writing
1. Under the PDPL, is a named employee's work email personal data that needs consent before a B2B email? Do generic role addresses fall outside the PDPL?
2. Does the TDRA policy create a direct obligation on senders, or only on licensees? Is there a B2B exception?
3. Does CR 56/2024 cover email or WhatsApp Business messages to businesses?
4. Is there an ADGM or DIFC exception for B2B?

---

## Q10 (new). Trade name and trade mark

### Findings

| Finding | Source | Tier | Date | Confidence |
|---|---|---|---|---|
| Commercial Companies Law: the trade name must not conflict with public order and must not repeat or be confusingly similar to a registered name. Each authority sets detailed trade-name rules. | https://uaelegislation.gov.ae/en/legislations/1542 | 1 (T1-snippet) | n/d | medium |
| Trade mark law (DL 36/2021) Art. 3, per commentary: unregistrable signs include non-distinctive and generic signs, **state emblems, flags and their imitations**, and marks misleading as to origin or source. **No express ban on "Gov" or government names was seen** (UNVERIFIED). | https://uaelegislation.gov.ae/en/legislations/1535/download ; https://paoletti.com/the-new-trademark-law-of-the-uae/ | 1 (T1-snippet) + 2 | 2021 | medium (structure); low (details) |
| IFZA naming guide: the name must not be a country or government name (example refused: "Emirates Contracting Services"), a city, suburb or famous neighbourhood; the activity should be reflected. Other guides: "Gulf" cannot be the first word; no profanity. | https://ifza.com/wp-content/uploads/2025/04/IFZA_Guide_2025_Naming_E-commerce_Business.pdf | 1 (T1-snippet; free-zone authority) | 2025 | medium |
| DET (per consultancies): names implying a link to a federal or local authority are rejected. Restricted words include "Dubai", "Emirates", "Ministry", "Authority", "Federal", religious terms and ruling-family names. Sources disagree on whether "UAE" or "Emirates" is barred or only conditional. A 2024 DET circular formalised a list (not seen). | https://dubaisouthbh.com/blogs/business-name-rules-in-dubai-what-is-allowed-what-gets-rejected ; https://businessandbeyond.ae/uae-business-naming-rules/ ; https://www.freezonematch.com/guides/uae-company-naming-trade-name-rules/ | 3 | 2026 | low-medium |
| No new federal trade-name law for 2025–2026 was found. The Ministry is now MoET (Ministry of Economy and Tourism). | Q10 search; C13 | 3 | 2025 | low |
| `.gov.ae` is a restricted third-level zone. aeDA keeps a reserved-names list, which was not seen. | https://www.aeserver.com/ae-domain-name-policy-explained/ ; https://centralnicdomains.com/ccTLDPolicies/AE/Domain%20Name%20Eligibility%20Policy.pdf | 3 / 1 (registry policy via registrar mirror) | 2010 policy | low-medium |
| A trade name gives no nationwide exclusivity. A third party can register it as a trade mark at the Ministry. | https://globallawexperts.com/trade-name-vs-trademark-uae/ | 3 | n/d | medium |
| "Tax" is not reported as a restricted word, but a mark that only describes the service (e.g. "UAE Tax Agents") is likely **non-distinctive** and hard to register or protect. | Paoletti (above), inference | 2 | n/d | low-medium |

### Working position
- Choose a coined or suggestive brand with no "UAE", "Emirates", "Gov", "Federal", "Ministry", "Authority", "National", "Official", "FTA", "MoF", emirate names, or "Gulf" as first word.
- "Tax" may appear only as a descriptive suffix, e.g. "[Coined] Tax Directory". Do not make it the distinctive element.
- No falcon, flag, national colours used as an emblem, or FTA-like visual identity. No `.gov.ae`-like domain.
- Before buying a domain (needs owner approval): reserve the trade name with the chosen registrar, search the MoET trade mark register, and file a UAE trade mark. Likely Nice classes are 35 and 42; counsel or a trade mark agent to confirm.

### What a UAE-licensed lawyer must confirm in writing
1. Will the chosen name pass DET (or the chosen free zone) and the MoET trade mark examination?
2. Is "Tax" allowed in the trade name for a directory licence, or does it imply a regulated tax-agent activity the entity is not licensed for?
3. Clearance search results and a filing strategy (classes, Arabic transliteration).

---

## Top risks (ranked)

| # | Risk | Why | Mitigation now |
|---|---|---|---|
| 1 | Media licence needed and not held | DL 55/2023 covers websites that provide "promotion and advertising"; no directory exemption was found; the NMA also covers free zones | Launch blocker; restrict Sponsored to verified profile data; written NMA or counsel answer |
| 2 | Misleading-claim liability for credentials | CR 200/2025 (e-commerce) and CR 42/2025 (media) are now enforceable; the consumer definition includes companies | Dated, fail-closed badges; separate categories; no FTA logo or endorsement language |
| 3 | PDPL lead-sharing basis and controller roles | Consent first; no implementing rules; regulator restructured June 2026 | Explicit per-provider consent; independent-controller provider terms; UAE hosting preferred |
| 4 | Provider conduct risk passed on to the platform | Decision 1/2024 confidentiality (written taxpayer consent) and integrity rules; fee rules unseen | No success fees; no taxpayer data back-flow; get the official annex |
| 5 | Register-reuse breach | FTA T&C (consent clause; collecting or storing others' personal information) and MoF copyright; neither list is shown as open data | Per-record manual checks of provider-supplied data only; write to the FTA and MoF |

## Re-verification checklist for counsel (open each from a network that can reach `*.ae`)

- [ ] FTA T&C full text (s.2.1, s.9); FTA Open Data Policy and catalogue.
- [ ] FTA Decision 1/2024 official annex (Arabic and English).
- [ ] CD 40/2017 as amended by CD 129/2025 (consolidated Nov 2025 PDF).
- [ ] DL 55/2023 Arts. 8 and 12; CD 68/2024 Art. 27; CR 41/2025 Table 1; NMA decree-law (number and dates).
- [ ] DL 14/2023 and CR 200/2025.
- [ ] PDPL implementing regulations status; AI and Data Authority founding instrument.
- [ ] MoF Open Data Usage Guide (23 Feb 2026) full text; MoF open-data catalogue.
- [ ] TDRA Unsolicited Electronic Communications policy v1.1; CR 56/2024 text.
- [ ] DET activity list (portal and directory codes); DET 2024 trade-name circular; ECR 11/2025 eligible-activity list.
- [ ] Any number above (fees, fines, points, thresholds) enters the product only as a reviewed Fact record.
