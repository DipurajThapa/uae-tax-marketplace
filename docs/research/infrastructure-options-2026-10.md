# Infrastructure options: hosting, email, payments (October 2026)

Prepared: 2026-10-08. Supports owner decisions OPS-01 (hosting and database region), OPS-02 (payment provider) and owner questions Q4 and Q5. This is vendor research, not legal advice. Where personal data leaves the UAE, the transfer basis is a counsel question (LG-03).

## Summary

1. **The UAE cloud picture changed in 2026.** AWS me-central-1 (UAE) was damaged in March 2026. On 2026-09-15 AWS said data held only in zone mec1-az2 cannot be recovered, and it gave no restoration date for the region. **Do not plan new workloads on AWS me-central-1.**
2. **Hosting recommendation: Azure UAE North.** Use App Service (Linux container) or Container Apps, plus Azure Database for PostgreSQL Flexible Server. We found no confirmed damage to Azure UAE regions. Runner-up: **Render (Frankfurt)**, which is simpler and cheaper but moves data to the EU and needs counsel sign-off on the transfer.
3. **Budget, staging plus production, per month (all UNVERIFIED estimates):** Lean EU PaaS about USD 85–110 (AED 310–405). UAE minimal (Azure) about USD 80–130 (AED 295–480). UAE resilient (Azure, zone-redundant DB) about USD 450–550 (AED 1,650–2,020).
4. **Email recommendation: Postmark.** It is transactional-only, has strong deliverability, a bounce webhook and a DPA, at about USD 15 for 10k emails. Data is stored in the US. Runner-up: **Mailgun EU region** (same price, message data kept in the EU). Amazon SES in me-central-1 exists on paper, but that region is impaired.
5. **Payments recommendation: Stripe (UAE account).** Billing, usage meters, test mode, AED payouts at T+5 business days, customer tax IDs on invoices, and self-serve onboarding for mainland and free-zone entities. Runner-up: **Telr** (UAE-native, repeat billing, test mode), which has a monthly plan fee and no native metered billing.
6. **Owner actions:** decide Q2 (entity) and Q4 (region); get counsel's view on cross-border transfers; open Azure, Postmark and Stripe test accounts; approve a monthly budget. See the "Owner actions" section.
7. **Caveat:** the egress proxy blocked direct fetches of vendor pricing pages (stripe.com, postmarkapp.com, prices.azure.com). Every figure here comes from search-engine results on 2026-10-08. Confirm each price in the vendor console before you approve a budget.

Conventions: "Seen" means the date the source was seen. **UNVERIFIED** means we could not confirm the claim from a primary vendor source. FX uses the AED peg of 3.6725 per USD ([The National](https://thenational-the-national-prod.cdn.arcpublishing.com/lifestyle/2024/11/22/uae-dirham-dollar-peg), seen 2026-10-08), rounded to the nearest AED 5.

---

## 1. Hosting and database

### 1.1 Regional risk context (read first)

| Event | Source (seen 2026-10-08) |
|---|---|
| AWS me-central-1: from 2026-03-01, physical damage and power loss affected 2 of 3 AZs, linked to strikes during the Iran conflict. | [DCD](https://www.datacenterdynamics.com/en/news/aws-uae-outage-after-objects-struck-the-data-center-cause-fire-amid-iran-attacks/), [Computing](https://www.computing.co.uk/news/2026/two-aws-middle-east-availability-zones-down-after-datacentre-impacted-by-objects) |
| 2026-09-15: AWS said it cannot restore resources and data held only in mec1-az2. Work continues on az1 and az3, with a UAE update promised "in the coming months". | [Help Net Security 2026-09-17](https://www.helpnetsecurity.com/2026/09/17/aws-middle-east-outage-permanent-data-loss-bahrain-uae/), [InfoQ](https://www.infoq.com/news/2026/09/aws-middle-east-data-loss/), [Insurance Journal 2026-09-16](https://www.insurancejournal.com/news/international/2026/09/16/885283.htm) |
| Reports say AWS told some customers to move workloads out of the Middle East regions. | [Tom's Hardware](https://www.tomshardware.com/tech-industry/data-centers/amazon-reportedly-tells-customers-in-abu-dhabi-and-bahrain-to-find-safer-harbors-for-their-data-aws-has-no-timeline-for-resuming-operations-six-months-after-drone-strikes-damaged-data-centers-in-the-region) (we could not open the article; title only) |
| Oracle Dubai: shrapnel hit a building facade in early April 2026. An internal memo reported the Dubai availability domain as "hard down" for an extended period. Status pages conflicted. Current status is UNVERIFIED. | [DCD](https://www.datacenterdynamics.com/en/news/iran-attack-hits-an-oracle-data-center-in-dubai-causes-limited-damage/) |
| Microsoft denied any hits or outages in its Gulf regions. As of April 2026, The Register reported no damage to Microsoft facilities. | [Tech Policy Press](https://www.techpolicy.press/the-legal-and-policy-fallout-from-data-center-strikes-in-the-middle-east-war/), [The Register 2026-04-08](https://www.theregister.com/2026/04/08/microsoft_armored_datacenters/) |
| A ceasefire has been in place since 2026-04-08. | [Wikipedia](https://en.wikipedia.org/wiki/United_Arab_Emirates_in_the_2026_Iran_war) (tertiary source) |

**Implication:** in-country hosting concentrates physical risk in one place. Whichever host is chosen, ENG-14 (off-host encrypted backups plus restore drills) is a hard requirement. If backups go outside the UAE, that is also a cross-border transfer question for counsel.

### 1.2 Option comparison

| Option | UAE data residency | Managed Postgres | Backups / PITR | Docker container + hourly worker | Private staging | Indicative cost, staging + prod / month |
|---|---|---|---|---|---|---|
| **AWS me-central-1** | Yes, but the region is impaired. AZ mec1-az2 data is lost (see 1.1). | RDS was in the 2022 launch service list ([AWS blog](https://aws.amazon.com/blogs/aws/now-open-aws-region-in-the-united-arab-emirates-uae/)). | RDS automated backups and PITR (standard feature). Current regional capacity is UNVERIFIED. | ECS Fargate plus EventBridge Scheduler (availability in the region is UNVERIFIED). **App Runner is closed to new customers** ([AWS docs](https://docs.aws.amazon.com/apprunner/latest/dg/architecture.md)). **Lightsail is not offered in me-central-1** ([re:Post](https://repost.aws/questions/QUKyddIC3JQ5qhoJ7ZWwejJw/is-lightsail-coming-to-uae)). | Security groups / ALB rules | Not estimated. **Not recommended** while the region is impaired. |
| **Azure UAE North (Dubai)**, paired with UAE Central | Yes. Data at rest in the UAE. UAE Central is restricted to in-country DR for UAE North customers ([azurespeed](https://www.azurespeed.com/Information/AzureRegions/UAECentral), third-party). | PostgreSQL Flexible Server is in UAE North ([Azure update 2021](https://azure.microsoft.com/pt-pt/updates/the-public-preview-of-azure-database-for-postgresql-flexible-server-now-supported-in-new-regions-2/)) and UAE Central (2024, UNVERIFIED). | Automatic backups with PITR, RPO up to 15 min ([Microsoft Learn](https://learn.microsoft.com/en-gb/azure/postgresql/flexible-server/concepts-backup-restore)). The 7–35-day retention range and geo-backup support in UAE North are UNVERIFIED. | App Service for Linux containers (UAE North is listed on the [pricing page](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)). Worker: Container Apps scheduled job with cron in UTC ([Learn](https://learn.microsoft.com/en-us/AZURE/container-apps/jobs)); Container Apps availability in UAE North is UNVERIFIED. Fallback: a second container on the same App Service plan running the worker loop. | App Service access restrictions (IP allowlist) and built-in auth. Region-specific confirmation is UNVERIFIED. | USD 80–130 minimal, or 450–550 resilient (see 1.3). |
| **Oracle Cloud Dubai (me-dubai-1) / Abu Dhabi (me-abudhabi-1)** | Yes | OCI Database with PostgreSQL; availability in UAE regions is UNVERIFIED ([Oracle availability](https://www.oracle.com/ae/cloud/distributed-cloud/service-availability/)). | Managed backups (UNVERIFIED for UAE) | OCI Container Instances or a VM; UAE availability is UNVERIFIED. | NSG / WAF | Not estimated. Dubai availability-domain status is uncertain (see 1.1). Higher setup effort. |
| **Google Cloud Doha (me-central1)** | No (Qatar) | Cloud SQL for PostgreSQL is listed for me-central1 ([Google](https://cloud.google.com/sql/docs/postgres/region-availability-overview)). | Cloud SQL automated backups and PITR (standard feature) | Cloud Run plus Cloud Scheduler. Cloud Run is listed in me-central1, Tier 2 pricing ([Google](https://docs.cloud.google.com/run/docs/locations)). | Cloud Run IAM / IAP | UNVERIFIED. No UAE residency, so it offers no advantage over the EU. |
| **Google Cloud Dammam (me-central2)** | No (KSA) | n/a | n/a | n/a | n/a | **Not available to us.** Access is only for KSA-based customers through CNTXT ([Google](https://docs.cloud.google.com/docs/dammam-region-access)). |
| **Core42 (G42)** | Yes (Sovereign Public Cloud on Azure) | Via Azure | Via Azure | Via Azure | Via Azure | Aimed at the public sector and regulated entities. No self-serve general cloud for SMEs found ([Core42 brochure](https://digital.core42.ai/resources/sovereign-public-cloud-brochure)). Quote-based, UNVERIFIED. |
| **Khazna** | Yes | No | No | No | No | **Not a fit.** Wholesale hyperscale colocation, not a cloud platform ([DCD](https://www.datacenterdynamics.com/en/analysis/khazna-the-emirati-data-center-operator-that-doesnt-use-diesel/)). |
| **du / e& enterprise cloud** | Yes | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | No public pricing found. Sales-led and quote-based (UNVERIFIED). |
| **Render (Frankfurt)** | No (EU) | Render Postgres. Cheapest paid tier quoted as USD 6, 7 or 10 depending on source (UNVERIFIED). | PITR on paid DBs only: 3 days (Hobby workspace), 7 days (Professional) ([Render docs](https://docs.render.com/postgresql-backups)). | Docker web service plus native cron job (from about USD 1/month plus per-minute compute, third-party [makerkit](https://makerkit.dev/pricing-calculator/render)). | Private services; basic auth must be done in the app (UNVERIFIED for IP allowlist). | USD 85–110 (see 1.3) |
| **Fly.io (fra / ams)** | No (EU) | Managed Postgres; Basic price quoted at USD 15–38 depending on source (UNVERIFIED) ([fly.io pricing](https://fly.io/pricing.md)). | Volume snapshots billed from January 2026 (third-party). | Docker native; scheduled Machines for cron. | Private networking / flycast | UNVERIFIED, roughly USD 50–90 |
| **Railway (Amsterdam metal)** | No (EU) | Railway Postgres (a container with a volume, not fully managed) | No native PITR. Docs recommend pg_dump from a cron service to a bucket ([Railway docs](https://docs.railway.com/guides/postgres-backups-restores)). | Docker plus cron services (UTC, minimum 5 minutes) | Private networking | Hobby USD 5 / Pro USD 20 plus usage (third-party). UNVERIFIED, roughly USD 30–70 |
| **Vercel + Neon (fra1 / Frankfurt)** | No (EU) | Neon serverless Postgres; Launch plan price conflicts across sources (UNVERIFIED) ([costbench](https://costbench.com/changelog/neon-plan-removed-2026-02/)). | Neon PITR / branching (retention UNVERIFIED) | Not a long-running Node server. Next.js runs as functions; Vercel Cron calls a route. Does not match our "Docker container plus worker" design. | Vercel deployment protection (paid add-ons UNVERIFIED) | Vercel Pro USD 20/seat ([makerkit](https://makerkit.dev/blog/saas/vercel-cost)) plus Neon. UNVERIFIED, roughly USD 40–70 |

### 1.3 Budget scenarios (staging + production, per month)

All lines are **UNVERIFIED estimates** built from third-party price snippets seen 2026-10-08. Prices exclude VAT and egress, and they assume low traffic (under 10k visits a month).

| Scenario | Components | USD / month | AED / month |
|---|---|---|---|
| **A. Lean EU PaaS (Render Frankfurt)** | Workspace fee USD 19–25 ([livemy.app](https://livemy.app/blog/render-pricing)); prod web Standard USD 25 and staging Starter USD 7 ([stackscored](https://www.stackscored.com/pricing/dev-hosting/render/)); hourly cron about USD 1–2; prod Postgres about USD 19 (UNVERIFIED); staging Postgres about USD 6–10 | 85–110 | 310–405 |
| **B. UAE minimal (Azure UAE North)** | 2 × App Service B1 Linux at about USD 13–17 each. USD 13.14 is a non-UAE figure ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/a/12322935)); the UAE uplift is UNVERIFIED. 2 × PostgreSQL B1ms at USD 15 each in uaenorth ([Bytebase, updated 2026-07-20](https://www.bytebase.com/dbcost/azure-flexible/instance/B1ms/)), plus storage about USD 4–5 each (UNVERIFIED). Container Registry Basic about USD 5, logs about USD 5–15, scheduled job about USD 0–5 (all UNVERIFIED). | 80–130 | 295–480 |
| **C. UAE resilient (Azure UAE North)** | Prod App Service Premium v3 (P0v3–P1v3) about USD 60–120; prod PostgreSQL General Purpose 2 vCore with zone-redundant HA about USD 300–360; staging as in B about USD 35; Front Door / WAF about USD 35; long-term backup and monitoring about USD 30. All UNVERIFIED. | 450–550 | 1,650–2,020 |

Scenario B can drop further by putting staging and prod on one App Service plan, at the cost of shared capacity.

### 1.4 Recommendation

- **Recommended: Azure UAE North.** It is the only major hyperscaler with UAE regions where we found no confirmed 2026 damage. It offers a managed Postgres with PITR, runs a Docker container natively, provides a cron mechanism and IP allowlisting for staging, and supports in-country DR to UAE Central. It keeps UAE residency open as an option while counsel resolves PDPL transfers. Start on scenario B and move to C before launch if the owner approves.
- **Runner-up: Render (Frankfurt).** It is the cheapest and simplest to operate, with native Docker, cron and PITR. It moves personal data to the EU, so counsel must confirm a PDPL transfer basis first (LG-03). It is also the fastest way to get a private staging environment if Azure onboarding stalls.
- **Not recommended now:** AWS me-central-1 (impaired, no restoration date) and Oracle Dubai (status unclear). Khazna and Dammam are not suitable products. Core42 and du/e& are sales-led and sized for enterprises.

---

## 2. Transactional email

Volume assumption: about 5k emails/month (enquiry notifications, verification links, password resets). SPF, DKIM and DMARC: every vendor below supports SPF and DKIM via DNS records on our domain. DMARC is a DNS TXT record we publish ourselves. Start at `p=none` with reporting, then move to `quarantine` once alignment passes.

| Vendor | Data location | DPA | Deliverability notes | Price for about 5k/month | Bounce webhook | Source (seen 2026-10-08) |
|---|---|---|---|---|---|---|
| **Amazon SES** | Region-selectable. me-central-1 added June 2025, but the region is impaired (see 1.1). | AWS DPA (standard) | Good once out of the sandbox; needs reputation management. | About USD 0.50–0.80. USD 0.10 per 1k à la carte; new plans from July 2026 at USD 0.16 per 1k (third-party). | SNS / EventBridge notifications | [AWS what's new 2025-06](https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-simple-email-service-new-aws-regions); [dev.to](https://dev.to/mr_manushukla/amazon-ses-pricing-plans-in-2026-essentials-vs-pro-vs-enterprise-and-when-a-la-carte-still-wins-1ohg) (UNVERIFIED pricing) |
| **Postmark** | US (Chicago-area data centre plus AWS); no EU region | Yes, with SCCs | Transactional-focused with separate message streams; strong reputation | USD 15 (Basic, 10k); free tier is 100/month | Yes, per-stream bounce webhook with JSON payload | [Postmark EU privacy](https://postmarkapp.com/euprivacy), [GDPR FAQ](https://postmarkapp.com/support/article/1218-gdpr-faq), [bounce webhook](https://postmarkapp.com/developer/webhooks/bounce-webhook), [pricing (third-party)](https://automationatlas.io/answers/postmark-pricing-explained-2026/) |
| **Resend** | Sending region selectable (us-east-1, eu-west-1, sa-east-1, ap-northeast-1), but **account data and logs are stored in the US** | Yes, with SCCs | Good, developer-focused; newer vendor | Free (3k/month, 100/day cap) is not enough; Pro USD 20 (50k) | Yes (webhooks) | [Resend regions](https://resend.com/docs/dashboard/domains/regions), [GDPR](https://resend.com/security/gdpr), [pricing](https://www.resend.com/pricing.md) |
| **Mailgun (Sinch)** | US or **EU region per domain**. Message data stays in region; account and billing data are global. | Yes (text not reviewed, UNVERIFIED) | Good; shared IPs on Basic | USD 15 (Basic, 10k) | Yes, `permanent_fail` event with signed payload | [Mailgun regions](https://www.mailgun.com/regions), [webhooks](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhooks), [pricing (third-party, checked 2026-10-02)](https://automationatlas.io/answers/mailgun-pricing-explained-2026/) |
| **SendGrid (Twilio)** | US, or EU via EU subusers on paid plans only | Yes | Large shared pools; mixed reputation for small senders | USD 19.95 (Essentials, 50k); permanent free plan replaced by a 60-day trial | Yes (Event Webhook) | [Twilio EU residency FAQ](https://www.twilio.com/docs/sendgrid/data-residency/faq), [pricing (third-party)](https://automationatlas.io/answers/sendgrid-pricing-explained-2026/) |
| **Brevo** | EU (France / Germany; GCP Belgium) | Yes, in-account (third-party report) | Transactional traffic shares infrastructure with marketing sends | Free tier 300/day (about 9k/month); paid from about USD 9 | Yes (transactional webhooks) | [meetergo scan](https://scan.meetergo.com/en/vendors/brevo-sending), [pricing (third-party)](https://automationatlas.io/answers/brevo-pricing-explained-2026/) |
| **Zoho ZeptoMail** | Zoho opened UAE data centres (Dubai and Abu Dhabi) in January 2026, but **ZeptoMail availability in the UAE DC is UNVERIFIED** | Zoho DPA (UNVERIFIED for ZeptoMail) | Transactional-only product | First 10k-email credit free; then about USD 2.50 per 10k credit, valid 6 months (UNVERIFIED) | Yes (webhooks, UNVERIFIED detail) | [Zoho pricing](https://www.zoho.com/zeptomail/pricing.html), [Zoho UAE DCs](https://www.datacenterdynamics.com/en/news/zoho-corp-launches-two-data-center-regions-in-uae/) |

**Recommendation: Postmark.** It is the best fit for low-volume transactional mail that must arrive, such as password resets and verification links. It offers stream separation, a bounce webhook, a black-hole test domain, a DPA and simple pricing (USD 15/month, about AED 55). Data is in the US, so counsel must confirm the transfer basis.

**Runner-up: Mailgun with EU-region domains.** Same price; message data, events and suppressions stay in the EU.

**Worth one email to Zoho:** ask whether ZeptoMail can run from the UAE data centre. If it can, it would be the only in-country option at near-zero cost. Avoid SES in me-central-1 until AWS confirms the region is restored.

---

## 3. Payments

Product needs: monthly subscriptions in AED, a usage-based charge per lead, test mode, signed webhooks, and tax invoices that show our TRN and the customer's TRN. The app's `BillingProvider` interface hides the vendor, so the decision rests on onboarding, fees and features.

| Provider | Recurring / subscriptions | Usage-based billing | Test mode | Onboarding (UAE entity) | Fees (published or reported) | Payouts | VAT invoice with TRN | Source (seen 2026-10-08) |
|---|---|---|---|---|---|---|---|---|
| **Stripe (UAE)** | Yes. Billing is listed as available in the UAE. | Yes, Billing meters with usage-based prices | Yes | Self-serve. Accepts sole establishments, free-zone establishments, LLCs and free-zone LLCs. Needs a trade licence; an MoA for LLCs; a bank statement; passport, Emirates ID and visa for representatives and owners of 25% or more. Individuals without a licence are not supported. | 2.9% + AED 1 domestic cards; +1% international; +1% FX (Stripe FAQ, may be dated). Billing 0.7% of billing volume (third-party, UNVERIFIED). Minimum charge AED 2. | AED to a UAE bank at **T+5 business days**; first payout delayed 7 days; minimum AED 20 | Customer tax IDs appear on invoice PDFs. Stripe Tax supports the UAE. Our own TRN goes on invoices via account tax ID settings (UNVERIFIED). | [Products in UAE](https://support.stripe.com/questions/which-payments-methods-and-products-are-available-in-the-uae), [activation reqs](https://support.stripe.com/questions/uae-account-activation-requirements), [business verification](https://support.stripe.com/questions/uae-business-verification-requirements), [UAE pricing FAQ](https://support.stripe.com/questions/uae-promotional-pricing-faqs), [payouts](https://support.stripe.com/questions/payouts-for-uae-accounts), [Tax UAE](https://docs.stripe.com/tax/supported-countries/europe-middle-east-and-africa/united-arab-emirates), [tax IDs](https://docs.stripe.com/tax/invoicing/tax-ids.md), [Billing 0.7% (third-party)](https://usagebox.com/articles/stripe-billing-fees-2026-the-07-percent-math) |
| **Checkout.com** | Yes (stored cards, Account Updater) | Not native; app-computed amounts charged to a stored card | Yes (sandbox) | **Sales-led.** Aimed at larger merchants; minimum volume may exclude us (UNVERIFIED) | Interchange++ or negotiated; no public UAE rate | UNVERIFIED | App-generated | [kolonell](https://kolonell.com/en/blog/psp-comparison-b2b-payments-dubai-2026), [learnwithhasan](https://learnwithhasan.com/payment-gateways/checkout-com/) (third-party) |
| **Network International (N-Genius Online)** | UNVERIFIED | Not native | UNVERIFIED | Sales-led, quote-based | No public rate card | UNVERIFIED | App-generated | [network.ae](https://www.network.ae/en/press-and-media/network-international-launches-n-genius-payment-platform-for-uae-businesses), [rfp.wiki](https://www.rfp.wiki/payments-fraud/payment-gateways/network-international/paytabs) |
| **Telr** | Yes, "Repeat Billing" (Remote API); needs the acquirer to support continuous authority | Not native; fixed-schedule agreements. Variable lead charges would need card-on-file charges (UNVERIFIED). | Yes (test flag) | Trade licence (details UNVERIFIED) | Tiered monthly plan (reported AED 99–349/month) plus about 2.49–2.69% + AED 0.50–1 per transaction (third-party, UNVERIFIED). Fees exclude VAT. | UNVERIFIED | App-generated | [Telr pricing](https://telr.com/pricing), [Repeat Billing docs](https://docs.telr.com/reference/repeat-billing-for-remote) |
| **PayTabs** | Yes, recurring billing and tokenization (third-party) | Not native | Yes (sandbox, third-party) | UNVERIFIED | Setup fee reported at AED 0–1,835 by plan; about AED 183.50/month; about 2.7% + AED 0.99 (third-party, conflicting) | UNVERIFIED | App-generated | [blesshost](https://blog.blesshost.com/?p=9716) (third-party) |
| **Tap Payments** | Conflicting reports | Not native | Yes ("instant sandbox") | Licensed by CBUAE (April 2025, third-party) | 2.0–2.75% (+ AED 1), or quote-based (conflicting) | Reviews mention settlement holds (single source) | App-generated | [dodopayments](https://dodopayments.com/blogs/tap-payments-alternatives), [paymentproviders.io](https://paymentproviders.io/compare/tap-payments-vs-myfatoorah) (third-party) |
| **Ziina** | Not found | No | UNVERIFIED | Ziina Business account | 2.6% + AED 1; +1.5% international or non-AED; fees include VAT | Settles in AED (timing UNVERIFIED) | App-generated | [Ziina fees](https://ziina.com/help-center/12781259-what-are-the-fees-to-use-ziina-business) |
| **Amazon Payment Services** | UNVERIFIED | Not native | UNVERIFIED | CBUAE retail payment licence (2023) | AED 280/month + 2.8% + AED 1 (third-party, may be dated) | UNVERIFIED | App-generated | [Fintech Times](https://thefintechtimes.com/amazon-payment-services-expands-uae-offering-following-retail-payment-services-license/), [element8](https://www.element8.ae/e-commerce/payment-gateways-uae/) (third-party) |

**Illustrative cost on AED 10,000/month of card volume, at 50 charges** (domestic cards, UNVERIFIED rates):

| Provider | Calculation | Cost |
|---|---|---|
| Stripe | 2.9% + AED 1 × 50 + Billing 0.7% = 290 + 50 + 70 | about AED 410 |
| Telr (Small tier) | AED 149 + 2.69% + AED 1 × 50 = 149 + 269 + 50 | about AED 468 |
| Ziina | 2.6% + AED 1 × 50 = 260 + 50 (no subscription features) | about AED 310 |

**Recommendation: Stripe (UAE account).** It is the only option with self-serve onboarding for both mainland and free-zone entities, native subscriptions plus usage meters (which match lead billing), a full test mode, signed webhooks, customer tax IDs on invoices and published AED payout terms. It also makes ENG-05 the smallest piece of work.

**Runner-up: Telr.** It is UAE-native with repeat billing and a test flag, but it lacks native metered billing. The app's internal ledger would compute lead charges, and Telr would collect them, either via card-on-file or as one-off payment links. That path is UNVERIFIED and needs confirmation from Telr.

Checkout.com and Network International are better treated as later options once volume justifies a negotiated rate.

Invoices: whichever provider we choose, the tax invoice must show our TRN once we are VAT-registered. The VAT treatment itself goes to a reviewer-signed guide or accountant, not to code (repo rule). Stripe charges VAT on its own fees unless we enter a verified UAE VAT ID ([Stripe](https://support.stripe.com/questions/taxes-on-stripe-fees-for-uae-businesses)).

---

## 4. Owner actions

| # | Action | Needed for | Documents / inputs | Cost approval |
|---|---|---|---|---|
| 1 | Decide the operating entity (Q2: mainland, free zone, DIFC or ADGM). DIFC and ADGM have their own data-protection regimes. | Everything below | n/a | n/a |
| 2 | Ask counsel (LG-03): is EU or US processing acceptable under PDPL, and on what basis? Covers hosting (if not UAE), email (Postmark is US, Mailgun is EU) and off-site backups. Executive Regulations status is contested in secondary sources ([Kayrouz & Associates](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026)). | Region choice, email choice | This document | Counsel fee |
| 3 | Check current regional status on the Azure status page and the AWS Health Dashboard. | Hosting | n/a | n/a |
| 4 | Create an Azure subscription (pay-as-you-go) and run the Azure pricing calculator for UAE North with the scenario B components. Set a budget alert. | OPS-01 | Company card; entity details for billing; VAT ID if registered | Approve a scenario B ceiling (suggest USD 150, about AED 550, per month) and say whether to move to C before launch |
| 5 | Optional fallback: create a Render workspace in Frankfurt for private staging only, with no real personal data. | Staging if Azure stalls | Card | About USD 40/month |
| 6 | Create a Postmark account (or Mailgun EU). Add SPF, DKIM and DMARC records to the domain's DNS. Request the DPA. | Email | Domain DNS access; DPA signature | USD 15/month (about AED 55) |
| 7 | Email Zoho: can ZeptoMail be hosted in the UAE data centre? | Email option | n/a | n/a |
| 8 | Create a Stripe account in **test mode** now and share keys through the environment secret settings (never in the repo). Live activation later requires the documents in the next column. | OPS-02, ENG-05 | Trade licence; MoA (LLC); UAE bank account and statement less than 6 months old; passport, Emirates ID and visa for representatives and owners of 25% or more; TRN if registered | Card fees per transaction; Billing about 0.7% (confirm in dashboard) |
| 9 | Approve live payments and a public deployment separately, as repo rules require. | Launch gate | n/a | n/a |

## 5. Method and limits

- All research used web search on 2026-10-08. Direct fetches of vendor pages (stripe.com, postmarkapp.com, bytebase.com, prices.azure.com) were refused by the environment's egress proxy, and *.ae hosts were not attempted. No block was circumvented.
- Many prices come from third-party aggregators that summarise vendor pages. They are labelled "third-party" and should be treated as UNVERIFIED until checked in the vendor console.
- Conflict-related regional status changes quickly. Recheck section 1.1 immediately before any decision.
