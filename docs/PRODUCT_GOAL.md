# Product goal

## Mission
Help UAE businesses find qualified Corporate Tax, VAT and e-invoicing professionals they can trust, and give genuine providers a steady flow of qualified, consented enquiries.

## Business outcomes (measurable after launch)
| Outcome | Metric | Source |
|---|---|---|
| Visitors find relevant providers | search → profile view rate | `analytics_events` (search_performed, profile_viewed) |
| Demand is qualified | assessment completion rate; enquiries per completed assessment | assessment_started/completed, enquiry_submitted |
| Providers act on leads | acceptance and response rate within 2 business days | `enquiry_recipients.status`, `respondedAt` |
| Supply grows and stays fresh | claimed listings; verified credentials; % overdue re-checks | `organizations`, `credentials` |
| Revenue | paying providers, MRR, overage revenue, waived-lead rate | `subscriptions`, `lead_charges` (test mode until live billing is approved) |

No product-market-fit claim is made until these are measured on real traffic.

## Non-negotiables
1. No fabricated providers, credentials, reviews or figures. Synthetic data is flagged, labelled, never verified, never shown in production.
2. Registration claims are evidence-backed (who checked, how, when) and re-checked on schedule. Overdue or disputed means no badge (fail closed).
3. The three regulated roles stay distinct: FTA-listed tax agent (individual), FTA-listed tax agent (firm), MoF-accredited e-invoicing service provider.
4. Consent-first lead routing to buyer-selected providers only; withdraw and erase at any time; 12-month retention.
5. Paid placement never affects ranking or eligibility, and is always labelled.
6. No public launch, live payments or outreach without owner approval and counsel sign-off on the launch blockers in `TASK_BACKLOG.md`.

## Release-candidate acceptance (engineering)
All ten cross-system scenarios from the directive have automated evidence (`EVIDENCE_LOG.md`). Release blockers that need people (counsel, owner decisions, real supply) are tracked separately and are not engineering tasks.
