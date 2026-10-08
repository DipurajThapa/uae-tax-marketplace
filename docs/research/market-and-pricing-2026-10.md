# Market and pricing research: provider-paid plans (pre-launch)

- Prepared: 2026-10-08. Every source below was accessed on 2026-10-08 unless stated otherwise.
- Prepared by: research agent (automated desk research). This is not legal, tax or financial advice.
- Supersedes nothing. It informs `BIZ-02` and owner question `Q7`, and it feeds counsel item `LG-04`. D-007 prices stay placeholders until the owner decides.

## Summary

1. **Supply is small and countable.** The FTA reported **936 registered tax agents** at its 30 Apr 2026 board meeting, up from 899 in Feb 2026. The split between individuals and firms is UNVERIFIED, so the number of firms that could pay is lower than 936. The MoF listed **41 pre-approved e-invoicing providers** on 30 Jun 2026.
2. **Demand is large.** There were about **743,000 Corporate Tax registrants and 587,000 VAT registrants** (FTA, 30 Apr 2026). E-invoicing creates two deadline-driven waves. Large businesses must appoint an ASP by **30 Oct 2026**; sources disagree, and some still give the older 31 Jul 2026. Everyone else must appoint by **31 Mar 2027**.
3. **A client is worth little to an agent on one-off work and a lot on recurring work.** Public prices run from about AED 1,050 to 4,500 for a CT return and about AED 750 to 3,180 per quarter for VAT returns. SME bookkeeping is about AED 500 to 5,000 a month. All of these are vendor price pages.
4. **No UAE competitor combines register-checked credentials, explainable matching and consented enquiries.** The alternatives are self-asserted directories (AdvisoryHub, Yellow Pages), software partner directories (Wafeq, QuickBooks, Zoho), paid "top 10" lists (DesignRush) and Google Ads. Most UAE competitors do not publish their prices.
5. **International comparables charge for each enquiry.** VouchedFor charges **£45 per business enquiry** to accountants and Unbiased charges **from £52 per enquiry** to financial advisers. Bark leads cost about **£7 to £22**. Clutch sponsorships cost about **US$1,500 to 4,000+ per month**.
6. **The placeholder plans have three problems.**
   - (a) They include more enquiries than early demand can supply.
   - (b) An extra lead costs about 3 times the effective price of an included one.
   - (c) The **plan-based monthly cap removes a provider from matching** (`src/lib/matching.ts:69`, `at_capacity`). This means paid status changes eligibility, which conflicts with Non-negotiable 5.
7. **Recommendation (estimate, to validate in interviews):**
   - Free listing: 2 enquiries a month included, then optional pay-as-you-go at AED 120 each.
   - Professional: **AED 399/month** with 6 included enquiries and AED 90 for each extra.
   - Firm: **AED 1,199/month** with 20 included enquiries and AED 75 for each extra.
   - Monthly capacity is set by the provider, not by the plan.
   - Founding members (the first 30 verified providers) pay 50% less for 12 months, and a month with no enquiries is not charged.
   - Sponsored placement starts at **AED 750 per slot per month**, and only after counsel item `LG-02` is cleared.
8. **Unit economics depend on demand cost, not on provider pricing.** At the one UAE accounting CPC figure found (AED 28, UNVERIFIED), a paid-search enquiry costs several times what the plans earn per enquiry. Organic search, the guides and partnerships have to supply most of the demand.
9. **Counsel must decide** whether per-enquiry fees, subscriptions or sponsored placement expose FTA-listed agents to risk under FTA Decision 1 of 2024 (`LG-04`). US bar opinions on lawyers split on this question. Nothing here concludes it. The plans below can be switched to subscription-only with no per-lead fee if counsel advises that.

## Method and limits

- **Only search excerpts were available.** WebSearch worked. WebFetch failed with a DNS error (`ENOTFOUND`) on every host tried, including nukta.com, wam.ae, stackcue.com and support.vouchedfor.co.uk. As a result, **every figure here comes from a search-engine excerpt of the cited page; no page was opened directly.** This is the same limitation as `stage0-regulatory-ledger.md`.
- **Labels used:**
  - **T1-snippet**: an official source, seen only as an excerpt.
  - **Vendor**: a company's own price page or blog.
  - **3P**: a third-party estimate.
  - **UNVERIFIED**: could not be confirmed.
  - **Estimate**: this document's own arithmetic or assumption.
- **Currency conversions are estimates.** USD uses the AED peg of 3.6725, which is well known but was not fetched this session. GBP uses an **assumed** rate of 1 GBP ≈ AED 4.9, which must be checked before use. Converted values are rounded.
- **Every UAE price should be re-checked.** Re-read each one on the live page from a network that can reach `*.ae` before the owner relies on it.

---

## 1. Market size

### 1a. Supply: FTA tax agents and MoF e-invoicing providers

| Metric | Value | As of | Source | Label |
|---|---|---|---|---|
| Registered tax agents | **936** | FTA board meeting, 30 Apr 2026 | https://www.wam.ae/en/article/bzz6pxj-maktoum-bin-mohammed-chairs-fta-board-directors | T1-snippet (WAM) |
| Registered tax agents | 899 | FTA board review, 13 Feb 2026 | https://mediaoffice.ae/en/news/2026/february/13-02/maktoum-bin-mohamed-reviews ; https://www.wam.ae/en/article/bypxrds-maktoum-bin-mohamed-reviews-fta’s-development | T1-snippet |
| Registered tax agents | 806 | end Sep 2025 (reported Nov 2025) | https://www.arabianbusiness.com/industries/banking-finance/uae-tax-compliance-grows-as-fta-sees-651000-corporate-registrants-and-vat-refund-surge ; https://mediaoffice.ae/en/news/2025/november/02-11/maktoum-bin-mohammed-chairs-board-meeting-of-federal-tax-authority | 3 / T1-snippet |
| Registered tax agents | 676 | Q1 2025 (board meeting 29 Apr 2025) | https://mediaoffice.ae/en/news/2025/april/29-04/maktoum-bin-mohammed-chairs-fta-board-meeting-to-review-kpis ; https://www.wam.ae/en/article/bjf7ten-maktoum-bin-mohammed-chairs-fta-board-meeting | T1-snippet |
| Individuals vs firms (juridical-person agents) in that total | **UNVERIFIED** | — | No breakdown found. FTA registration fees are AED 3,000 for an individual agent and AED 10,000 for a firm: https://tax.gov.ae/en/services/registration.of.tax.agents.aspx | T1-snippet (fees only) |
| MoF pre-approved e-invoicing providers | **41** (plus 15 "in pipeline" and 40 "in application review") | 30 Jun 2026 | https://mof.gov.ae/wp-content/uploads/2026/06/UAE-eInvoicing-Programme-30June2026.pdf | T1-snippet |
| Pre-approved providers in earlier lists | 5 (first list, Sep 2025); 8 (Oct 2025) | Sep–Oct 2025 | https://mof.gov.ae/wp-content/uploads/2025/09/List-and-Contact-Details-of-the-Ministry-of-Finance-Pre.pdf ; https://mof.gov.ae/wp-content/uploads/2025/10/Pre-approved-service-providers-page.pdf | T1-snippet |
| Pre-approved providers (third-party count) | 42 | undated, 2026 | https://www.e-invoice.app/e-invoicing-compatibility/uae | 3P |

Notes:
- **Agent growth.** The count rose by about 38% from Q1 2025 (676) to Apr 2026 (936). This is an estimate from the figures above.
- **The number of firms that could pay is unknown.** Many firms employ several listed individuals. Until the split is known, treat 936 as an **upper bound on listings**, not on paying customers. The UNVERIFIED assumption used in §4 is that the firms behind those agents number in the low hundreds.
- **Two MoF lists exist and are not the same.** The MoF publishes a "pre-approved" list and a separate "accredited (ASP)" list: https://mof.gov.ae/en/about-us/initiatives/einvoicing/einvoicing-accredited-service-providers-asps/ (T1-snippet). The total on the accredited list could not be confirmed, so this document does not merge the two.

### 1b. Demand: registrants

| Metric | Value | As of | Source | Label |
|---|---|---|---|---|
| Corporate Tax registrants | **~743,000** | 30 Apr 2026 | https://www.wam.ae/en/article/bzz6pxj-maktoum-bin-mohammed-chairs-fta-board-directors | T1-snippet |
| VAT registrants | **~587,000** | 30 Apr 2026 | same | T1-snippet |
| Corporate Tax / VAT registrants | ~710,000 / ~573,000 | 13 Feb 2026 | https://mediaoffice.ae/en/news/2026/february/13-02/maktoum-bin-mohamed-reviews | T1-snippet |
| Corporate Tax / VAT registrants | 651,000 / 547,000 | end Sep 2025 | https://www.arabianbusiness.com/industries/banking-finance/uae-tax-compliance-grows-as-fta-sees-651000-corporate-registrants-and-vat-refund-surge | 3 |
| Corporate Tax / VAT registrants | 537,340 / 510,940 | Q1 2025 | https://mediaoffice.ae/en/news/2025/april/29-04/maktoum-bin-mohammed-chairs-fta-board-meeting-to-review-kpis | T1-snippet |
| CT registration applications completed in 2025 | >245,000 (and 98,000 VAT applications) | FTA 2025 Annual Report, released 29 Jun 2026 | https://www.wam.ae/en/article/c0ywq25-federal-tax-authority-issues-2025-annual-report ; https://www.gulftoday.ae/business/2026/06/29/uae-fta-reports-record-dhs46-billion-revenue-for-2025 | T1-snippet / 3 |
| Number of CT returns filed | **UNVERIFIED** (not found) | — | — | — |

On ratios: there are about 794 Corporate Tax registrants for each listed agent (743,000 / 936). This is an estimate. Most registrants are small and many file without an agent, so the ratio shows only that buyers vastly outnumber agents. It does not size the paid market.

### 1c. E-invoicing timeline

| Phase | Scope | Appoint ASP by | Go-live | Source | Label |
|---|---|---|---|---|---|
| 1 | Revenue ≥ AED 50m | **30 Oct 2026** (moved from 31 Jul 2026 by the May 2026 amendment; some sources still show 31 Jul) | 1 Jan 2027 | https://movingo.ae/news/uae-extends-e-invoicing-service-provider-deadline-to-october-2026 ; https://www.wafeq.com/en-ae/tax-and-reporting/uae-e-invoicing-timeline ; `stage0-regulatory-ledger.md` decision 4 | 3 / Vendor |
| 2 | Revenue < AED 50m | **31 Mar 2027** | 1 Jul 2027 | https://kpmg.com/ae/en/insights/tax-insights/implementation-of-the-electronic-invoicing-system-in-the-uae.html ; https://www.zoho.com/books/academy/ae/taxes-and-compliance/faq-einvoicing-uae.html | 2 / Vendor |
| Government entities | — | UNVERIFIED | 1 Oct 2027 | https://www.banqup.com/en-be/resources/blog/uae-confirms-phased-e-invoicing-mandate-rollout | Vendor |
| Legal basis | Ministerial Decisions 243 and 244 of 2025 (28 Sep 2025). Penalty decision: Cabinet Decision 106 of 2025 | — | — | https://www.cleartax.com/sa/e-invoicing-united-arab-emirates ; https://www.wafeq.com/en-ae/tax-and-reporting/uae-e-invoicing-timeline | Vendor |

On demand timing: the phase 1 appointment window has almost closed (today is 2026-10-08). The **phase 2 window, which runs to 31 Mar 2027, is the realistic e-invoicing demand peak** for this platform. Launch gates (`LG-*`) are not yet cleared, so the platform may miss part of that peak. This is an estimate.

The number of businesses in phase 1 (revenue ≥ AED 50m) is **UNVERIFIED** (not found).

### 1d. What clients pay tax agents (public price pages)

All prices are vendor list prices. Scope varies a lot between them.

| Service | Price found | Provider / source | Label |
|---|---|---|---|
| CT registration | From AED 199 (basic); AED 1,499 package (registration + consultation + submission help) | Micstax: https://service.micstax.it.com/ | Vendor |
| CT return filing | AED 1,050 incl. VAT (Small Business Relief case); AED 2,625 incl. VAT (non-SBR case) | BCL Globiz: https://bcl.ae/resources/guides-and-insights/corporate-tax/what-is-the-cost-of-tax-return-uae/ | Vendor |
| CT return filing | AED 1,299 (fast-track, books ready); AED 2,899 (clean-up + filing); AED 4,500 (enterprise) | Osome: https://osome.com/ae/corporate-tax-filing/ | Vendor |
| CT compliance packages | AED 500–2,500 starting prices; AED 400/month compliance package | BCL Globiz: https://bcl.ae/resources/guides-and-insights/corporate-tax/what-are-the-uae-tax-agent-fees/ | Vendor |
| CT filing (annual, outside bookkeeping) | ~AED 2,000–5,000/year | Tally: https://tallysolutions.com/mena/uae-vat/how-much-does-accounting-cost-for-small-businesses-in-the-uae/ | Vendor |
| VAT return filing | AED 750–900/quarter (≤500 transactions/month) up to AED 3,180/quarter (4,001+); excl. VAT. Farahat's own pages disagree on the entry price | Farahat: https://farahatco.com/services/vat-accounting-uae ; https://farahatco.com/vat-return-filing-pricing/package-6/ | Vendor |
| VAT return filing | AED 800–2,000 (monthly or quarterly; unclear which) | ItsHerWay: https://www.itsherway.com/products/vat-return-filing | Vendor |
| SME bookkeeping | AED 500–1,500/month (basic); 1,500–5,000 (standard SME); 5,000–12,000+ (full) | BCL: https://bcl.ae/resources/guides-and-insights/accounting-bookkeeping/how-much-do-accounting-services-cost-in-dubai/ ; Alpha Partners: https://www.alphapartners.co/blog/in-house-accountant-vs-outsourced-accounting-in-uae-whats-the-right-choice-for-your-business | Vendor |
| FTA representation (reconsideration, audit, disputes) | **No public price found.** One source says hourly or project fees are usual | BCL: https://bcl.ae/resources/guides-and-insights/corporate-tax/what-are-the-uae-tax-agent-fees/ | UNVERIFIED |
| E-invoicing (ASP software + integration) | Licence AED 500–8,000/yr; support AED 500–2,400/yr; integration AED 2,000–8,000 one-off (estimates) | Tally: https://awsstgpreprod.tallysolutions.com/mena/uae-vat/e-invoicing-implementation-cost-uae-smes/ | Vendor estimate |

Do not confuse these with FTA fees. The FTA's own private-clarification fee (AED 1,500 or 2,250) is a government charge, not an agent fee: https://www.deloitte.com/middle-east/en/services/tax/research/applicable-fees-for-taxpayers-seeking-private-clarifications.html.

---

## 2. UAE competitors and alternatives

| Alternative | What it is | Pricing model (public?) | Source | Notes |
|---|---|---|---|---|
| AdvisoryHub.ae | Directory of "FTA-registered tax agents" and accounting firms, with a matching quiz; claims 200–250+ advisers | **Not public** (has a "For Advisors" page) | https://pvdpdaiszsxzmllitesk.supabase.co/functions/v1/llms-txt | The closest direct competitor. "Verified" is self-described; its method of checking is UNVERIFIED |
| Wafeq Partner Directory | Accounting-software partner directory (UAE/KSA); one snapshot showed 78 partners; partner tiers | **Free to join**; partners earn commission or discounts on clients they refer to Wafeq | https://www.wafeq.com/en-ae/accounting-partners/directory ; https://www.wafeq.com/en-eg/partners/join | Wafeq is also MoF-listed as an e-invoicing provider: https://www.wafeq.com/en-ae/press-releases/business-regulations-brief/wafeq-listed-as-an-e-invoicing-service-provider-by-the-uae-ministry-of-finance |
| QuickBooks "Find an Accountant" (UAE) | Quote requests to QuickBooks-certified ProAdvisors; city pages for Dubai and Abu Dhabi; the UAE-wide list says "coming soon" | Free to buyers; ProAdvisor certification route; **no listing fee found** | https://quickbooks.intuit.com/ae/find-an-accountant/ ; https://quickbooks.intuit.com/ae/find-an-accountant/dubai/ | Software-certification signal, not an FTA credential |
| Zoho partner network (UAE) | Resellers and implementers that describe themselves as Zoho partners | Partner programme; **official UAE locator not found** | https://cloudfysystems.com/blog/zoho-partner-uae ; https://www.aaxonix.com/zoho-partner-uae | UNVERIFIED whether Zoho runs a UAE accountant directory |
| DesignRush (UAE accounting category) | Ranked agency directory with paid positions | **US$200 / 300 / 500 per month (≈AED 735 / 1,100 / 1,840)**, 1-year minimum paid upfront; includes bidding on leads and a "Top 10" spot | https://www.designrush.com/marketplace/membership ; https://www.designrush.com/agency/accounting/ae | Paid ranking: the opposite of our rule |
| Yellow Pages UAE (yellowpages-uae.com) | General business directory with premium placements | **Not public**; sold by media consultants | https://yellowpages-uae.com/pages/about-us | — |
| Bayut / Gulf News "top firms" lists | Editorial or advertorial lists | Advertorial (price not public) | https://www.bayut.com/mybayut/tax-vat-consultants-uae/ ; https://gulfnews.com/gn-focus/count-on-the-excellence-of-the-uaes-top-accounting-and-taxation-firms-1.500275385 | Firm-run "best consultant" pages are common (e.g. https://bcl.ae/blogs/best-corporate-tax-consultants-dubai.md) |
| Google Ads | Paid search for "tax consultant Dubai" and similar | Cost per click. One UAE accounting figure: **AED 28 average CPC** (no stated dataset or date). Legal/finance AED 15–30 or AED 50–120 depending on source | https://www.andava.com/learn/uae-digital-marketing-statistics/ ; https://redberries.ae/google-adwords-dubai-why-businesses-still-use-it-for-paid-growth/ | UNVERIFIED. Check in Keyword Planner before relying on it |
| Bark | Quote marketplace | Credits (see §3) | — | **UNVERIFIED that Bark serves the UAE.** No UAE pages surfaced in search |
| ServiceMarket (owned by e&) | Home-services marketplace | Not relevant (no accounting category found) | https://servicemarket.com/en/about-us ; https://www.wamda.com/en/2023/02/e-acquires-uae-based-servicemarket | — |
| dubizzle / classifieds | Classifieds with service ads | **Not public** | https://classifieds.gulfnews.com/ad/tax-and-accounting-services-in-the-uae | Low trust signal |
| Free-zone partner networks | IFZA reports 1,500+ "Authorized Partners and Consultants"; DMCC keeps an approved-auditor list | Partner status needs a licence; **no public accountant directory or price found** | https://ifza.com/en/about/ ; https://ifza.com/en/guide/how-to-become-an-ifza-professional-partner/ ; https://farahatco.com/blog/accounting-services-dmcc | Mostly company-formation channels |
| FTA "Registered Tax Agents" register | Official list with sector filters | Free; **no matching and no enquiries; reuse restricted** (see ledger) | `stage0-regulatory-ledger.md` decision 1 | The source of truth for verification, not a competitor |

Several things stand out:
- **No competitor shows register-dated verification.** None was seen showing "checked against the FTA register on [date] by [reviewer]".
- **None separates the three regulated roles**: individual tax agent, firm tax agent and e-invoicing provider.
- **None publishes its ranking method**, and none keeps paid placement out of ranking.

These are positioning points rather than pricing points. The positioning must be checked against counsel items `LG-01` and `LG-05`.

---

## 3. International comparables

| Platform (market) | Model | Price points found | AED equivalent (estimate) | Source | Date / label |
|---|---|---|---|---|---|
| **VouchedFor** (UK, accountants) | Subscription + per-enquiry charge | Verified plan for accountants **£38/month** (or £456/yr). On the Unlimited plan: **£15 per individual enquiry, £45 per business enquiry** | ≈186/month; ≈74 / ≈220 per enquiry | https://support.vouchedfor.co.uk/article/rhe30miunp-pricing-summary ; https://support.vouchedfor.co.uk/en/articles/7761538 | Undated support pages; 3P notes rates for other professions changed on 1 Sep 2026: https://whito.co.uk/mortgage-advisers/guides/mortgage-broker-marketing-costs/ |
| VouchedFor (UK, financial advisers) | Subscription | £60/month Verified; Unlimited £85 or £96/month (sources disagree) | ≈294; ≈417–470 | same; https://whito.co.uk/financial-advisers/guides/adviser-fees-and-lead-costs/ | Vendor / 3P |
| **Unbiased** (UK, financial advisers; accountants have a separate tier) | Subscription credits redeemed against enquiries the adviser **chooses to accept** | £302 / £1,292 / £3,272 per month (Standard, Premium, Enhanced; launched Jan 2024); enquiries **from £52**; later raised by 7.5% (subscriptions) and 11.5% (leads) | ≈1,480 / 6,330 / 16,030 per month; ≈255 per enquiry | https://financialplanningtoday.co.uk/news/unbiased-unveils-subscription-based-pricing-embargoed-12pm-thursday-14-december ; https://financialplanningtoday.co.uk/news/unbiased-to-bump-up-fees-by-7-5 ; https://knowledge.unbiased.co.uk/enquiry-prices | Dec 2023 – 2024 news; **accountant prices UNVERIFIED** (table not visible) |
| Unbiased (older model) | Per lead | £36 per lead from "Connect with an adviser"; enquiry price raised from £30 to £45 | ≈176; ≈147–220 | https://professionaladviser.com/news/3006795/unbiased-money-grabbing-lead-generation-charges ; https://financialplanningtoday.co.uk/news/unbiased-to-raise-client-referral-charge-by-50-from-1-june | Undated, older |
| **Bark** (UK; UAE presence UNVERIFIED) | Prepaid credits to unlock a lead shared with several pros; Elite Pro subscription | List price **£1.80 per credit**; small lead 5–8 credits (**£7–14**), mid-size 8–15 credits (**£14–22**); credits expire after 3 months | ≈8.8 per credit; ≈34–108 per lead | https://whito.co.uk/trades/tools/bark-cost-uk/ ; https://www.itqlick.com/bark-com/pricing | 3P, Jul 2026 |
| **Thumbtack** (US) | Pay per lead or booking, no subscription | **US$10 to 100+ per lead**, varying by trade and job | ≈37–367 | https://leadcapture.io/blog/thumbtack-lead-cost/ ; https://www.housecallpro.com/resources/what-is-thumbtack-how-it-works/ | 3P; Thumbtack does not publish prices |
| **Clutch** (global B2B) | Annual sponsorship billed monthly; "Verified" billed upfront | **US$1,500–4,000+ per month** sponsorship; premium US$3,000–7,500+ | ≈5,500–14,700+ | https://www.hireinsouth.com/post/clutch-pricing ; https://help.clutch.co/knowledge/how-pay-sponsorship | 3P estimate (2026); terms from Clutch help centre |
| **UpCity** (US B2B) | Free profile; paid tiers | $0; Certified Partner **US$100+/month**; Agency Pro $150+/month | ≈0 / 367+ / 551+ | https://www.g2.com/products/upcity/pricing | 3P (G2) |
| **TaxBuzz** (US) | Tax-pro marketplace | **UNVERIFIED** for professionals. A 3P listing shows US$14.99–24.99/month, but its audience is unclear | ≈55–92 | https://saasbrowser.com/pl/saas/97266/taxbuzz | 3P, low confidence |
| **Avvo** (US, lawyers) | Profile subscription + advertising; formerly per-service "marketing fee" | Avvo Pro **from $49/month**; ads from $100/month; a 2026 3P shows $65–150. The old Legal Services fee ran from $10 (on a $39 service) to $400 (on $2,995) | ≈180 / 367 / 239–551 | https://jurisdigital.com/guides/is-avvo-paid-advertising-worth-the-money/ ; https://subger.com/en/service/avvo ; https://www.abajournal.com/news/article/avvo_violates_nj_ethics_rules_banning_fee_sharing_lawyer_referral_payments | 3P; the NJ ethics view is relevant to §4 risks |
| **Justia** (US, lawyers) | Free directory + premium placement | Quote-based; 3P estimates range from **$19.99/month** (Connect Pro) to **$300–1,500+/month** per practice area and location | ≈73; ≈1,100–5,500 | https://growlaw.co/blog/justia-lawyer-directory ; https://getciville.com/?p=16253 | 3P, conflicting |
| **Martindale-Hubbell / Lawyers.com** (US) | Quote-based profile and lead packages | 3P: "frequently **$399/month** and up"; 2005 figures ($50–900/month) are obsolete | ≈1,465+ | https://supergood.ai/api-report-card/martindale ; https://myshingle.com/2005/05/articles/marketing/why-sponsorship-on-lawyers-com-is-not-worth-900month | 3P |

Patterns:
- **Professional-services marketplaces in the UK combine a subscription with a per-enquiry charge** (VouchedFor, Unbiased).
- **Credit marketplaces are cheap per lead but shared and poorly rated** (Bark).
- **B2B directories sell flat sponsorship with annual commitments** (Clutch, DesignRush).
- **Win rates are rarely published.** One UK study says 0 of 10 trade platforms publish one (https://whito.co.uk/trades/tools/bark-cost-uk/). Unbiased publishes adviser testimonials of 12.5% to "over 30%" conversion. These come from its own marketing and are not audited: https://www.unbiased.co.uk/pages/pages/successstories/mpifinance.

---

## 4. Recommendation

### 4a. Lead value to a provider (estimate)

Formula: **expected first-year gross margin per enquiry = client first-year fee × win rate × provider gross margin.**

Assumptions (all estimates):
- **Win rate 10–30%.** Each enquiry goes to up to 3 providers, so a fair share is at most about 33%, and some buyers hire no one. Central case: **20%**.
- **Provider gross margin 50%.** This is an assumption, not sourced. The interviews must test it.
- **Client fees** come from §1d.

| Client type (fee basis) | First-year fee (AED) | Value per enquiry at 10% / 20% / 30% win (AED) | Gross margin per enquiry at 20% win (AED) |
|---|---|---|---|
| CT return only, Small Business Relief case (BCL) | 1,050 | 105 / 210 / 315 | 105 |
| CT return, non-SBR (Osome mid tier) | 2,899 | 290 / 580 / 870 | 290 |
| VAT returns (4 quarters × AED 900) + CT return 2,625 | ≈6,200 | 620 / 1,240 / 1,860 | 620 |
| Bookkeeping AED 1,500/month + VAT + CT | ≈24,000 | 2,400 / 4,800 / 7,200 | 2,400 |
| E-invoicing setup (integration 2,000–8,000 + licence 500–8,000) | ≈2,500–16,000 | 250–4,800 | 250–1,600 |

What this means:
- **AED 75–120 per enquiry is affordable for recurring work.** It is 3–20% of first-year margin in the recurring rows, and that is before multi-year retention.
- **It is expensive for one-off Small Business Relief filings.** At a 20% win rate it consumes most of the margin.

This calls for the following:
- a **single flat enquiry price**, so the price does not vary with the size of the engagement or with whether the buyer hires the provider (see risk R1);
- **provider-controlled service filters**, so firms can opt out of one-off, low-value job types.

The price should not change by job type.

### 4b. Proposed launch pricing (AED per month, excluding VAT; estimates for owner decision)

| Plan | List price | Founding price (first 30 verified providers, 12 months, price locked) | Included enquiries/month | Each further enquiry | Monthly capacity | Features (none affects ranking or eligibility) |
|---|---|---|---|---|---|---|
| Listing (free) | 0 | 0 | 2 | AED 120, optional pay-as-you-go (opt-in with a payment method) | **Set by the provider** (default 5) | Verified profile, receives matched enquiries |
| Professional | **399** | 199 | 6 | AED 90 | Set by the provider (default 20) | Contact details on profile (D-011), analytics (D-017), longer profile |
| Firm | **1,199** | 599 | 20 | AED 75 | Set by the provider (default 60) | Multiple named agents, team seats, analytics; may buy Sponsored |
| Sponsored placement (add-on) | **AED 750 per slot per month** (one emirate × one service category, at most 2 slots per results page) | 50% off for the first 3 months | — | — | — | Separate block labelled "Sponsored"; never in ranked results. **Do not sell until `LG-02` (media licence) is cleared and organic search pages have measurable traffic** |

Why these numbers (estimates):
- **The plans are internally consistent.** Pay-as-you-go beats Professional below about 6 enquiries; at 6 the costs are AED 480 vs 399. Professional beats Firm below about 15 enquiries; at 20, Professional costs AED 1,659 vs Firm's 1,199. The effective included price runs from AED 60–67 per enquiry (Professional) to AED 60 (Firm). An extra enquiry costs about 1.25–1.5 times that, not 3 times as in D-007.
- **They sit inside the observed range.**
  - Per enquiry: Bark at about AED 34–108 (shared, low quality), VouchedFor at about AED 220 per business enquiry, and Unbiased from about AED 255 per adviser enquiry.
  - Subscriptions: VouchedFor accountants at about AED 186, DesignRush at about AED 735–1,840, and Clutch at about AED 5,500+.
  - Our enquiries are shared with up to 2 others, so they are priced below exclusive UK enquiries.
- **The included volumes are small on purpose.** Early demand will be thin. Plans that include 10–40 enquiries (D-007) would mostly be unused, so providers would be paying for nothing and would churn.
- **Founding offer.** The first 3 months are AED 0, since billing stays in the test ledger until the owner approves live payments anyway. Then the founding price applies for 12 months.
  - **A month with no enquiries delivered is not charged.**
  - This must not be described in copy as "guaranteed" (forbidden phrase); describe it as "not charged".
  - The offer is limited to 30 providers because credential review needs two staff per approval (D-012).
- **E-invoicing providers** use the same plans at launch. With only about 41 providers, revisit after the interviews: deal sizes may support a separate e-invoicing provider tier.

Required change (an engineering ticket, not done here): **monthly capacity must be a provider setting that does not depend on the plan.**
- Today `maxLeadsPerMonth` comes from the plan (`src/lib/billing.ts:22-24`) and drives `at_capacity` ineligibility (`src/lib/matching.ts:69`).
- That makes a free provider ineligible after 3 enquiries while a paid one stays eligible, so paid status changes eligibility.
- Even with the fix, pay-as-you-go beyond the free allowance links eligibility to willingness to pay per enquiry. **The owner should decide whether that is acceptable under Non-negotiable 5.**

Fallback if counsel says per-enquiry fees are risky (LG-04):
- Drop per-enquiry charges. Use flat subscriptions with fair-use capacity: Professional AED 499 and Firm AED 1,499 (the D-007 levels) with no extra-enquiry fees, plus Sponsored at a fixed monthly fee.
- A fixed advertising-style fee is the structure that bar opinions treat most favourably (see R1).

### 4c. Unit economics sanity check (estimates)

Month-12 scenario (all inputs assumed):
- 28 Professional and 12 Firm providers at list price.
- 15% of paid providers buy 5 extra enquiries.
- 60 free listings use their 2 included enquiries.
- An average of 2.5 providers per buyer enquiry.

| Line | Calculation | AED/month |
|---|---|---|
| Subscriptions | 28 × 399 + 12 × 1,199 | 25,560 |
| Extra enquiries | 6 providers × 5 × ~85 | ~2,550 |
| Sponsored (only if LG-02 cleared) | 4 slots × 750 | 3,000 |
| **Revenue** | | **~31,100** (≈ AED 373k/yr) |
| Provider-enquiries needed | 28 × 6 + 12 × 20 + 30 + 60 × 2 | ≈ 560 |
| Buyer enquiries needed | 560 / 2.5 | ≈ 225 |
| Revenue per buyer enquiry | 31,100 / 225 | ≈ AED 138 |

**Paid demand does not pay back at these numbers.**
- At AED 28 per click (UNVERIFIED) and an assumed 3–5% click-to-enquiry rate, one buyer enquiry costs about AED 560–930.
- That is 4–7 times the AED 138 earned per enquiry. Break-even would need a click-to-enquiry rate of about 20%. This is an estimate.
- Demand must therefore come mainly from:
  - organic search and the reviewer-signed guides;
  - partnerships, such as software vendors, free-zone setup channels and banks. Any referral-fee arrangement in these partnerships needs counsel (R1).
- Paid search should be limited to tests.

**The supply-side ceiling is modest.**
- If the 936 listed agents map to roughly 300–500 firms (UNVERIFIED assumption), and 41–56 e-invoicing providers are added, then 10–25% paid conversion at about AED 600 average monthly revenue gives roughly **AED 250k–1.0m a year** (34–139 paying providers × AED 600 × 12). This is an estimate.
- Growth beyond that needs one of the following:
  - higher prices backed by measured win rates;
  - non-registered accountants or bookkeepers (blocked by `LG-05`);
  - other GCC markets.

**Costs to set against revenue (not quantified; estimates needed):**
- credential review time: firm listings re-checked yearly, individuals every 3 years (ledger decision 2);
- support and dispute handling;
- hosting and billing provider fees;
- counsel fees for LG-01 to LG-06.

**Provider ROI on Professional (AED 399, 6 enquiries):**
- At a 20% win rate, about 1.2 clients a month.
- On VAT + CT clients worth about AED 6,200, that is about AED 7,400 of first-year fees for AED 399.
- On one-off SBR returns worth AED 1,050 at a 10% win rate, it is about AED 630 of fees, a likely loss after costs.
- This confirms the need for service filters, and the interviews must test it.

### 4d. Risks

| # | Risk | Why it matters | Mitigation / owner |
|---|---|---|---|
| R1 | **Per-enquiry fees may be seen as referral fees or "unprofessional" client acquisition for FTA-listed agents** (FTA Decision 1 of 2024, Professional Standards; black points can lead to deregistration) | The text of the decision was not obtained. Summaries cover integrity and professional behaviour but not client acquisition: https://dlapiper.com/insights/publications/gulf-tax-insights/2024/gulf-tax-insights-april-2024/fta-issues-decision-professional-standards-for-tax-agents ; https://www.crowe.com/ae/news/application-of-black-points-system-to-tax-agents. US lawyer analogies split: NJ treated Avvo's per-service fee as an impermissible referral fee (https://www.abajournal.com/news/article/avvo_violates_nj_ethics_rules_banning_fee_sharing_lawyer_referral_payments); Colorado (2010) allowed fixed directory costs but not per-lead fees (https://ezel.ai/ethics-opinions/cobar/122-internet-lawyer-marketing-7-2); New York allows per-lead fees if selection is mechanical and transparent, the service does not recommend, and the fee does not vary with whether the client retains the lawyer (Op. 1131 https://ezel.ai/ethics-opinions/nysba/1131-paying-a-for-profit-lead-generation-service ; Op. 1294 https://ezel.ai/ethics-opinions/nysba/1294-solicitation-advertisement-lead-generators) | **Flag for counsel (LG-04); no conclusion here.** Design choices that keep options open: flat enquiry price; no success fee; no price tied to the engagement's value or to whether the buyer hires; matching that is published and deterministic (D-010); no "recommended" copy; subscription-only fallback (§4b). Also ask counsel whether the "explainable match" could be read as a recommendation |
| R2 | Sponsored placement may need a media or e-media licence | `LG-02` (ledger decision 6) | Do not sell Sponsored until cleared |
| R3 | Plan-based caps change eligibility | Conflicts with Non-negotiable 5 (§4b) | Make capacity a provider setting; owner decides on pay-as-you-go |
| R4 | Thin early demand | Subscribers who receive nothing will churn; reputational harm with a small, connected supply base | Small included volumes; months with no enquiries are not charged; founding cohort capped at 30 |
| R5 | Seasonality | CT filing deadline (e.g. 30 Sep 2026: https://www.wam.ae/en/article/c2fwaqk-fta-sets-september-2026-deadline-for-filing-tax) and e-invoicing deadlines make volume spiky; capacity overflows in peaks | Provider-set capacity; let providers change it mid-month |
| R6 | Price anchoring to Bark-style cheap leads | Providers may compare against AED 30–100 shared leads | Show enquiry quality (completed assessment, consent, scope) and report response and acceptance metrics once they are real |
| R7 | Small supply ceiling | §4c | Revisit after interviews and 3 months of data |
| R8 | Data in this document is excerpt-only | §Method | Re-verify on live pages before the owner decision |
| R9 | Forbidden copy | Founding-offer and pricing-page wording ("guaranteed", savings promises) | Run `npm run lint:copy` on any pricing copy |

---

## 5. Provider interview guide (10 interviews)

### 5a. Sample

| Segment | Count |
|---|---|
| Small FTA-listed firm (1–5 staff) | 4 |
| Mid-size firm (6–50 staff) | 3 |
| Large or network firm | 1 |
| MoF-listed e-invoicing provider | 2 |

Aim for at least 3 emirates and at least 2 firms that also do bookkeeping.

### 5b. Recruiting without bulk use of the FTA or MoF registers

**Approval comes first.** "Real outreach" needs owner approval (repo rules; `BIZ-04`). Get approval for this plan and the invitation text before sending anything.

**Channels** (contact each person one at a time, with a personal message; no list building):
1. **LinkedIn.** Search by role ("tax agent", "corporate tax", "VAT manager") and location, and send personal invitations. Do not export or scrape.
2. **Professional bodies.** Ask the organiser to share an invitation with members; do not obtain member lists. Candidates: ACCA UAE (runs the UAE Tax and Regulation Certificate with the Ministry of Economy and EAAA: https://www.accaglobal.com/an/en/qualifications/glance/UAE-Tax-and-Regulation-Certificate1.html), the Emirates Association for Accountants and Auditors, and other institute groups. Whether there are ICAEW, CIOT or CIMA UAE groups is UNVERIFIED.
3. **Software partner programmes** (Wafeq, Zoho, QuickBooks). Ask the vendor's partner team to forward the invitation. Do not harvest their directories.
4. **Referrals.** Ask each interviewee for one or two peers.
5. **Events.** Tax and e-invoicing seminars and webinars, by direct conversation.
6. **E-invoicing providers.** Use each company's own website contact or LinkedIn after finding them by ordinary search. Contact no more than the 2–4 needed, never as a batch from the MoF list.

**Verification.** Check a participant's register entry individually only if it matters, for example to confirm the segment.

**Consent and records.**
- Use a short written consent covering purpose, notes, retention and no recording without consent (PDPL consent-first posture).
- Store notes without buyer data.
- Offer no cash. A founding-member place may be mentioned but not made a condition.

### 5c. Questions (about 45 minutes)

Ask about past behaviour before opinions. Do not show our prices until question 9.

1. **How you win clients today.** Walk me through how your last five new clients found you.
2. **Spend.** What did you spend on getting clients in the last 12 months, including ads, directories, sponsorships, partner commissions and staff time? Which channel produced the most clients for the money?
3. **Conversion.** Out of 10 enquiries you receive, how many become paying clients? What usually disqualifies an enquiry?
4. **Fees.** What is your typical first-year fee for CT registration, a CT return, VAT returns, a bookkeeping retainer and FTA representation? How much of your revenue is one-off and how much recurring?
5. **Retention.** How many years does a typical SME client stay?
6. **Past platforms.** Have you paid for leads or listings (Google Ads, directories, Bark-type sites, software partner directories, advertorials)? What happened, and why did you continue or stop?
7. **Shared enquiries.** How would you value an enquiry sent to you and up to two other verified firms, compared with an exclusive one? What response time can you commit to?
8. **Model preference.** Would you prefer a monthly subscription, a per-enquiry charge or a mix? What would make you cancel?
9. **Price sensitivity (Van Westendorp).** For one qualified, consented enquiry at what price would it be:
   - so cheap you would doubt its quality?
   - a bargain?
   - getting expensive?
   - too expensive to consider?

   Then ask the same four questions for a monthly plan.
10. **Capacity and season.** How many new clients a month can you take, and how does that change around CT and e-invoicing deadlines?
11. **Enquiry content.** Which details in an enquiry make it worth your time (scope, entity type, transaction volume, deadline, language)? Which job types would you filter out?
12. **Professional standards.** Has your firm, or its advisers, considered whether paying for enquiries, a subscription or a sponsored placement is acceptable under the FTA Professional Standards (Decision 1 of 2024)? Which arrangements would you avoid? Record the answer only. Do not give a view.
13. **Verification.** Would you provide your registration number and documents for a dated check against the official register? Would a dated "checked" record change your willingness to pay?
14. **E-invoicing providers only.** What is your typical deal size (licence plus integration) and sales cycle? Do you work through tax agents or resellers? What would one qualified, consented enquiry be worth to you?

### 5d. What to record and decide afterwards

- **Record per interview:**
  - segment;
  - current cost per client acquired;
  - conversion rate;
  - first-year fee by service;
  - the four Van Westendorp prices;
  - preferred model;
  - the answer on professional standards.
- **Decision rule (proposal):**
  - If the median "getting expensive" price for an enquiry is AED 90 or more, and at least 6 of 10 accept a monthly plan, keep the §4b structure and adjust the numbers.
  - If most prefer subscription-only, or raise conduct concerns, use the fallback.
- **Where the results go:** add them to this file as §6 and update D-007 through the owner.
