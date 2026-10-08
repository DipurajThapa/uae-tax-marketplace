# Questions for the owner (blocking launch)

Engineering work that can be done without these answers is done. Each answer unblocks the items listed.

| # | Question | Why it blocks | Unblocks |
|---|---|---|---|
| Q1 | **Counsel:** who will advise, and can they give written opinions on the five questions in `docs/research/stage0-regulatory-ledger.md` ("Open questions for counsel"): FTA register reuse, media licence for promoted listings, PDPL consent/transfers, fee arrangements with tax agents, listing non-registered consultants? | Legal launch gate; consent text is still a draft | LG-01–LG-06, RV-M10, launch |
| Q2 | **Operating entity and location:** mainland, DIFC or ADGM? | Decides data-protection regime and media licensing route | LG-02, LG-03, OPS-01 |
| Q3 | **Brand and domain:** keep the working name "TaxPro Directory UAE" or choose another? May I buy the domain (cost)? | Public URLs, emails, canonical links | BIZ-01, OPS-03 |
| Q4 | **Hosting and database region** (billable): UAE region (e.g. a UAE cloud region) or outside with transfer safeguards? Budget ceiling per month? | PDPL transfers; everything production needs a host | OPS-01, ENG-14 backups, deploy |
| Q5 | **Payments:** which provider (Stripe, Checkout.com, Telr, Network International)? Create a test-mode account and share keys via the environment's secret settings. | Live subscriptions and lead billing | OPS-02, ENG-05 |
| Q6 | **Email:** which transactional provider (e.g. Postmark, SES, Resend) and sending domain? | Enquiry delivery, verification, password links in production | OPS-03, ENG-06, monthly insights email |
| Q7 | **Prices:** confirm or change the placeholder plans (free 3 leads; AED 499 / 10 leads + AED 150 overage; AED 1,499 / 40 leads + AED 120 overage, promotions). OK to interview 10+ providers first? | Commercial model is an assumption | BIZ-02 |
| Q8 | **Supply:** may I draft (not send) a letter to the FTA and the Ministry of Finance asking for permission or a data feed, and an outreach email inviting firms to list themselves? You approve before anything is sent. | No lawful bulk source of real providers | BIZ-03, BIZ-04 |
| Q9 | **Content reviewer:** who is the named professional (e.g. an FTA-listed tax agent) who will review guides? | Guides cannot be published without one | CT-01 |
| Q10 | **Network for research:** can the environment's network policy allow `*.gov.ae`, `*.ae`, `difc.com`, `adgm.com` so the regulatory ledger can be re-verified from the source pages? | Current findings rest on search excerpts | RG-01 |
| Q11 | **Launch:** when Q1–Q6 are done, do you approve a staging deployment first (not indexed), then production with `ALLOW_INDEXING=true`? | Deployment and indexing need your approval | M6/launch |

## Owner answers, 2026-10-08 (round 1)

| # | Owner's answer | What happens now |
|---|---|---|
| Q1 | Use Claude's legal skills for UAE due diligence | Done as research, not as a legal opinion. See `docs/research/legal-due-diligence-2026-10.md` and `docs/legal/`. Written opinions on LG-01–LG-05 still need a UAE-licensed lawyer before launch (launch gate unchanged). |
| Q2 | UAE | Entity options compared in the legal due-diligence note (mainland vs DIFC/ADGM vs commercial free zone); recommendation there |
| Q3 | Suggest an SEO- and GEO-friendly name | Options and recommendation: `docs/research/brand-name-options-2026-10.md`. Owner picks; domain purchase still needs approval of the cost |
| Q4 | Research, brainstorm, plan | `docs/research/infrastructure-options-2026-10.md` (hosting, region, budget scenarios) |
| Q5 | Research, brainstorm, plan | Same note, payments section |
| Q6 | Refer (recommend) | Same note, email section |
| Q7 | Research, brainstorm, plan | `docs/research/market-and-pricing-2026-10.md`, including the provider interview guide |
| Q8 | Yes: drafts, formal, natural tone | `docs/outreach/01-letter-fta-register.md`, `02-letter-mof-asp-list.md`, `03-provider-outreach-plan.md`. Nothing is sent without approval |
| Q9 | Use Claude's legal skills | **Not possible for this role.** The guide gate needs a named human professional with a credential, because the "Reviewed by" line is a public statement that a qualified person checked the text. An AI review cannot be that person. Claude can pre-review drafts (sources, copy rules) to save the reviewer's time. Candidate profile and sourcing in the decision memo |
| Q10 | `*.gov.ae` allowed | **Not yet effective in this session.** The egress proxy still refuses tax.gov.ae (HTTP 403, organisation policy), and the web fetch tool cannot resolve `.ae` names. The environment's allowed domains need `tax.gov.ae`, `mof.gov.ae`, `u.ae`, `uaelegislation.gov.ae` (or `*.gov.ae`, `*.ae`), then a new session. RG-01 stays open |
| Q11 | Private staging approved | Staging access gate built (HTTP Basic, fail closed, noindex). Deploying needs a hosting account in the owner's name (billable) and secrets. Steps in `docs/RUNBOOK.md` "Private staging" |

### Round 2 (2026-10-08)
- Q3: **Taxdar** chosen. App rebranded (name, descriptor, Arabic name, independence line, logo, favicon, structured data, email subjects). Still to do: registrar, trade-mark and trade-name checks before buying the domain.
