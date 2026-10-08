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
