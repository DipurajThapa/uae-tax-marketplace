import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
import { nextCode, E2E_TOTP_SECRETS } from "./mfa";

/**
 * Cross-system scenarios from the product directive, exercised in a real browser against
 * a production build and a real Postgres database. Tests run in order and share state.
 */
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !(u.pathname === "/login"));
  if (new URL(page.url()).pathname === "/login/mfa") {
    await page.getByLabel("Authentication code").fill(await nextCode(E2E_TOTP_SECRETS[email]));
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }
}

async function signOut(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}

/** Reads the newest email-confirmation token queued for an address (mail is not delivered in tests). */
async function verifyEmailToken(to: string): Promise<string> {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/marketplace_e2e" });
  await client.connect();
  try {
    const r = await client.query("select payload from notifications where to_address = $1 and template = 'verify_email' order by created_at desc limit 1", [to]);
    return r.rows[0].payload.setPasswordToken as string;
  } finally {
    await client.end();
  }
}

async function answerRadio(page: Page, legend: string, option: string) {
  await page.getByRole("group", { name: legend }).getByLabel(option, { exact: true }).check();
}

test("1. a business finds a registered tax professional, with checked registration shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("tax and e-invoicing professionals");
  await page.getByRole("combobox", { name: "Service" }).selectOption("fta-representation");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("link", { name: "E2E Verified Tax Agency" })).toBeVisible();
  await page.getByRole("link", { name: "E2E Verified Tax Agency" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Verified Tax Agency" })).toBeVisible();
  const reg = page.getByRole("region", { name: "Registrations and qualifications" });
  await expect(reg.getByText("Verified", { exact: true })).toBeVisible();
  await expect(reg).toContainText("checked against the official register");
  // Structured data is present and only includes verified credentials.
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join("")).toContain('"hasCredential"');
});

test("7. a user encounters no suitable matches and gets an explanation", async ({ page }) => {
  await page.goto("/match");
  await page.getByLabel("Excise Tax", { exact: true }).check();
  await page.getByLabel("Where is the business based?").selectOption("dubai");
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "Where is the business today?", "Operating for one year or more");
  await answerRadio(page, "Approximate annual revenue (AED)", "1 to 10 million");
  await answerRadio(page, "Number of employees", "10–49");
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "When do you need help?", "This month");
  await page.getByRole("button", { name: "See matching providers" }).click();
  await expect(page.getByText("No provider can take this enquiry yet")).toBeVisible();
});

test("2. a business submits a qualified, consented enquiry", async ({ page }) => {
  await page.goto("/match");
  // Required-answer validation blocks progress.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose at least one service")).toBeVisible();

  await page.getByLabel("VAT return preparation", { exact: true }).check();
  await page.getByLabel("Where is the business based?").selectOption("dubai");
  await page.getByLabel("Arabic", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "Where is the business today?", "Operating for one year or more");
  await answerRadio(page, "Approximate annual revenue (AED)", "1 to 10 million");
  await answerRadio(page, "Number of employees", "10–49");
  await page.getByRole("button", { name: "Continue" }).click();
  // Adaptive step: VAT question appears because a VAT service was chosen.
  await answerRadio(page, "Is the business registered for VAT?", "Yes");
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "When do you need help?", "This month");
  await page.getByRole("button", { name: "See matching providers" }).click();

  await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  await expect(page.getByText("E2E Verified Tax Agency")).toBeVisible();
  await expect(page.getByText("E2E Bookkeepers")).toBeVisible();
  // Unclaimed listings are never offered as recipients.
  await expect(page.getByText("E2E Unclaimed Firm")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "E2E Verified Tax Agency" }).check();
  await page.getByRole("button", { name: /Continue with 1 selected/ }).click();

  await page.getByLabel("Your name").fill("Erin Example");
  await page.getByLabel("Work email").fill("erin@buyer.example");
  await page.getByLabel("Company (optional)").fill("Buyer Trading LLC");
  const send = page.getByRole("button", { name: "Send enquiry" });
  await expect(send).toBeDisabled(); // consent required
  const consent = page.getByRole("checkbox", { name: /E2E Verified Tax Agency/ });
  await expect(consent).toBeVisible();
  await consent.check();
  await page.waitForTimeout(3200); // the anti-spam timer rejects forms filled in under 3 seconds
  await send.click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been sent" })).toBeVisible();
  await expect(page.getByText(/Reference: ENQ-/)).toBeVisible();
});

test("3. the provider receives and accepts that enquiry; another provider cannot see it", async ({ page }) => {
  await signIn(page, "books@e2e.invalid");
  await page.goto("/provider/enquiries");
  await expect(page.getByText("Erin Example")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /ENQ-/ })).toHaveCount(0);
  await signOut(page);

  await signIn(page, "agency@e2e.invalid");
  await expect(page).toHaveURL(/\/provider/);
  await page.goto("/provider/enquiries");
  const link = page.getByRole("link", { name: /ENQ-/ }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page.getByText("erin@buyer.example")).toBeVisible();
  await page.getByRole("button", { name: "Accept enquiry" }).click();
  await expect(page.getByText(/accepted/i).first()).toBeVisible();
  await signOut(page);

  // Scenario 9: a different provider gets a 404 for the same enquiry URL.
  await signIn(page, "books@e2e.invalid");
  const res = await page.goto(href!);
  expect(page.url()).toContain(href!); // still signed in, not bounced to /login
  expect(res?.status()).toBe(404);
  await expect(page.getByText("erin@buyer.example")).toHaveCount(0);
});

test("4/5. a business claims its listing and an administrator approves it", async ({ page }) => {
  await page.goto("/providers/e2e-unclaimed-firm");
  await page.getByRole("link", { name: /Claim this listing/ }).click();
  await page.getByLabel("Your name").fill("Uma Owner");
  await page.getByLabel("Work email").fill("uma@e2e-unclaimed-firm.example");
  await page.getByLabel("Your role at the firm").fill("Managing partner");
  await page.getByLabel(/How can we confirm/).fill("I am listed on the team page of our website as managing partner.");
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByRole("heading", { name: "Claim received" })).toBeVisible();

  await signIn(page, "reviewer@e2e.invalid");
  await page.goto("/admin/claims");
  await expect(page.getByText("uma@e2e-unclaimed-firm.example")).toBeVisible();
  await page.getByLabel("Review note").first().fill("Email domain matches the firm website");
  await page.getByRole("button", { name: "Approve claim" }).first().click();
  await page.waitForURL(/notice=/);
  await expect(page.getByText("uma@e2e-unclaimed-firm.example")).toHaveCount(0);
  await page.goto("/providers/e2e-unclaimed-firm");
  await expect(page.getByRole("link", { name: "Start an enquiry" })).toBeVisible();
});

test("ONB: a new firm lists itself, an admin publishes it, and a business's enquiry reaches the firm", async ({ page }) => {
  const firm = "E2E Self Listed Advisory LLC";
  await page.goto("/for-providers/register");
  await page.getByLabel("Legal name").fill(firm);
  await page.getByLabel("Type of firm").selectOption("accounting_firm");
  await page.getByLabel("Emirate of your main office").selectOption("dubai");
  await page.getByLabel("Public email").fill("hello@e2e-self-listed.example");
  await page.getByLabel("VAT return preparation", { exact: true }).check();
  await page.getByLabel("Arabic", { exact: true }).check();
  await page.getByLabel("Your name").fill("Sam Lister");
  await page.getByLabel("Your work email").fill("sam@e2e-self-listed.example");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password-123");
  await page.getByLabel("Repeat password").fill("e2e-password-123");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Submit listing for review" }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/provider"));
  // The owner confirms their email address from the link in the confirmation email.
  await page.goto(`/verify-email/${await verifyEmailToken("sam@e2e-self-listed.example")}`);
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  await signOut(page);

  // Not public until a member of staff reviews it.
  await page.goto("/providers");
  await expect(page.getByText(firm)).toHaveCount(0);

  await signIn(page, "admin@e2e.invalid");
  await page.goto("/admin/providers?status=draft");
  await page.getByRole("link", { name: firm }).click();
  await page.locator("#listing-note").fill("Trade licence and website checked");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.waitForURL(/notice=/);
  await signOut(page);

  // A business looking for VAT help in Dubai now finds the firm and sends it an enquiry.
  await page.goto("/match");
  await page.getByLabel("VAT return preparation", { exact: true }).check();
  await page.getByLabel("Where is the business based?").selectOption("dubai");
  await page.getByLabel("Arabic", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "Where is the business today?", "Operating for one year or more");
  await answerRadio(page, "Approximate annual revenue (AED)", "1 to 10 million");
  await answerRadio(page, "Number of employees", "10–49");
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "Is the business registered for VAT?", "Yes");
  await page.getByRole("button", { name: "Continue" }).click();
  await answerRadio(page, "When do you need help?", "This month");
  await page.getByRole("button", { name: "See matching providers" }).click();
  await page.getByRole("checkbox", { name: firm }).check();
  await page.getByRole("button", { name: /Continue with 1 selected/ }).click();
  await page.getByLabel("Your name").fill("Nadia Buyer");
  await page.getByLabel("Work email").fill("nadia@buyer.example");
  await page.getByRole("checkbox", { name: new RegExp(firm) }).check();
  await page.waitForTimeout(3200); // the anti-spam timer rejects forms filled in under 3 seconds
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("heading", { name: "Your enquiry has been sent" })).toBeVisible();

  // The firm sees the enquiry, with the buyer's details, in its own dashboard.
  await signIn(page, "sam@e2e-self-listed.example");
  await page.goto("/provider/enquiries");
  await page.getByRole("link", { name: /ENQ-/ }).first().click();
  await expect(page.getByText("nadia@buyer.example")).toBeVisible();
});

test("L4: a GET to /logout does not sign the user out", async ({ page }) => {
  await signIn(page, "agency@e2e.invalid");
  await page.goto("/logout");
  await page.goto("/provider");
  await expect(page).toHaveURL(/\/provider$/);
  await signOut(page);
});

test("L3: a crafted message in the URL is not shown", async ({ page }) => {
  await page.goto("/login?error=" + encodeURIComponent("Your account is locked. Call +971 50 000 0000"));
  await expect(page.getByText("Your account is locked")).toHaveCount(0);
});

test("ENG-13: staff need a second factor; a wrong code and a password alone get nowhere", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@e2e.invalid");
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/login\/mfa/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\/mfa/); // password alone does not open admin
  await page.getByLabel("Authentication code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code did not work")).toBeVisible();
  await page.getByLabel("Authentication code").fill(await nextCode(E2E_TOTP_SECRETS["admin@e2e.invalid"]));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/admin/);
  await signOut(page);
});

test("9. unauthorised users cannot reach privileged areas", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/provider");
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, "agency@e2e.invalid");
  await page.goto("/admin/billing");
  await expect(page).toHaveURL(/\/forbidden/);
  await signOut(page);
  await signIn(page, "reviewer@e2e.invalid");
  await page.goto("/admin/billing");
  await expect(page).toHaveURL(/\/forbidden/); // admin-only section
});

test("ENG-07: a provider adds a person and submits an individual registration", async ({ page }) => {
  await signIn(page, "books@e2e.invalid");
  await page.goto("/provider/people");
  await page.getByLabel("Full name").fill("Noor Al Mansoori");
  await page.getByLabel("Title (optional)").fill("Tax Associate");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText("Person added.")).toBeVisible();
  await page.getByLabel("Registration or qualification").selectOption("FTA_TAX_AGENT");
  await page.getByLabel("Registration or membership number").fill("E2E-TAAN-77");
  await page.getByLabel("Where can the reviewer check it?").fill("FTA register search by agent number");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Submitted for review")).toBeVisible();
  await expect(page.getByRole("cell", { name: "In review" })).toBeVisible();
  await signOut(page);
});

test("ENG-09: an admin writes, gates and publishes a guide; reviewers cannot publish", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin@e2e.invalid");
  await page.goto("/admin/guides");
  await page.getByText("New guide").click();
  await page.getByLabel("Title").fill("E2E guide: how registrations are shown");
  await page.getByLabel("Address (slug)").fill("e2e-registrations-guide");
  await page.getByLabel("Summary").fill("A test guide explaining how this directory shows the three kinds of registration.");
  await page.getByLabel("Body (Markdown)").fill("## Overview\n\n" + "This paragraph is test content for the end-to-end guide editor check. ".repeat(6));
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page.getByText("At least one official (Tier 1) source is required")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Sources").fill(`1 | ${today} | Federal Tax Authority | https://tax.gov.ae`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved. A published guide goes back to draft when edited.")).toBeVisible();
  await expect(page.getByText("A named reviewer with credential and review date is required")).toBeVisible();
  // review2 M3: the review is recorded separately and covers the saved text.
  await page.getByLabel("Reviewer name").fill("E2E Reviewer");
  await page.getByLabel("Reviewer credential").fill("FTA-listed tax agent");
  await page.getByLabel("Review date").fill(today);
  await page.getByRole("button", { name: "Record review of this text" }).click();
  await expect(page.getByText("Review recorded for the current text")).toBeVisible();
  await expect(page.getByText("All checks pass.")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  const editUrl = page.url();
  await page.goto("/guides/e2e-registrations-guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E guide: how registrations are shown");
  await expect(page.getByText("Reviewed by E2E Reviewer")).toBeVisible();
  await signOut(page);

  await signIn(page, "reviewer@e2e.invalid");
  await page.goto(editUrl);
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
  await signOut(page);
});

test("ENG-16: a provider turns on two-factor, signs in with a code, and turns it off", async ({ page }) => {
  test.setTimeout(90_000);
  const email = "security@e2e.invalid";
  await signIn(page, email);
  await expect(page).toHaveURL(/\/provider$/);
  await page.goto("/provider/security");
  await page.getByRole("button", { name: "Set up two-factor authentication" }).click();
  const key = (await page.getByTestId("totp-key").textContent())!.trim();
  E2E_TOTP_SECRETS[email] = key;
  await page.getByLabel("Code from your app").fill(await nextCode(key));
  await page.getByRole("button", { name: "Turn on two-factor authentication" }).click();
  await expect(page.getByText("Two-factor authentication is on.")).toBeVisible();
  await signOut(page);

  await signIn(page, email); // goes through /login/mfa with the new key
  await expect(page).toHaveURL(/\/provider$/);
  await page.goto("/provider/security");
  await page.getByLabel("Code from your app").fill(await nextCode(key));
  await page.getByRole("button", { name: "Turn off two-factor authentication" }).click();
  await expect(page.getByText("Two-factor authentication is off.")).toBeVisible();
  await signOut(page);
  delete E2E_TOTP_SECRETS[email];
});

test("ENG-10: insights show basic counts on the free plan and point to paid figures", async ({ page }) => {
  await signIn(page, "books@e2e.invalid");
  await page.goto("/provider/insights");
  await expect(page.getByText("Enquiries received")).toBeVisible();
  await expect(page.getByText("Profile views", { exact: true })).toHaveCount(0); // the tile, not the upgrade note
  await expect(page.getByText("included in paid plans")).toBeVisible();
  await signOut(page);
});

test("SEO: crawlers blocked before launch, pages render without JavaScript", async ({ browser, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/providers/e2e-verified-tax-agency");
  await expect(page.getByRole("heading", { level: 1, name: "E2E Verified Tax Agency" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/providers\/e2e-verified-tax-agency$/);
  await page.goto("/services/vat-returns");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("VAT return preparation");
  await ctx.close();
});

test("ENG-15: nonce-based CSP, no script unsafe-inline, no violations while pages hydrate", async ({ page, request }) => {
  const a = (await request.get("/")).headers()["content-security-policy"] ?? "";
  const b = (await request.get("/")).headers()["content-security-policy"] ?? "";
  const scriptSrc = a.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(scriptSrc).not.toContain("unsafe-inline");
  expect(a).not.toBe(b); // fresh nonce per request
  // review2 M6: prefetches and look-alikes of excluded paths carry the policy too.
  const csp = async (path: string, headers: Record<string, string> = {}) => (await request.get(path, { headers })).headers()["content-security-policy"] ?? "";
  expect(await csp("/providers", { "next-router-prefetch": "1", rsc: "1" })).toContain("script-src");
  expect(await csp("/providers", { purpose: "prefetch" })).toContain("script-src");
  expect(await csp("/api/health-x")).toContain("script-src");
  expect(await csp("/favicon.ico.html")).toContain("script-src");

  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to (execute|load)/i.test(m.text())) violations.push(m.text()); });
  for (const path of ["/", "/providers", "/providers/e2e-verified-tax-agency", "/match", "/login", "/for-providers/register"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // The wizard is a client component: interacting proves the hydrated JS executed under the policy.
  await page.goto("/match");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Choose at least one service")).toBeVisible();
  expect(violations).toEqual([]);
});

test("accessibility: key pages have no serious axe violations", async ({ page }) => {
  for (const path of ["/", "/providers", "/providers/e2e-verified-tax-agency", "/match", "/for-providers", "/how-we-verify"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test("mobile @mobile: home, search and assessment fit the screen", async ({ page }) => {
  for (const path of ["/", "/providers", "/match"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});
