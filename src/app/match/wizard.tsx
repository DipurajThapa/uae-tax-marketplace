"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUESTIONS, applicableQuestions, type Answers, type Question } from "@/lib/questions";
import { MAX_RECIPIENTS } from "@/lib/matching";
import {
  SERVICES,
  SERVICE_CATEGORIES,
  EMIRATES,
  JURISDICTIONS,
  INDUSTRIES,
  LANGUAGES,
  SERVICE_BY_CODE,
  CREDENTIAL_BY_CODE,
} from "@/lib/taxonomy";
import { findMatchesAction, submitEnquiryAction, consentTextAction, type MatchView } from "./actions";

type Step = "needs" | "business" | "details" | "preferences" | "results" | "contact";
const STEP_LABELS: Record<Step, string> = {
  needs: "Needs",
  business: "Business",
  details: "Details",
  preferences: "Preferences",
  results: "Matches",
  contact: "Contact",
};

type Props = { preselect: { id: string; name: string; services: string[]; emirate: string } | null; initialService?: string };

export function MatchWizard({ preselect, initialService }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(() => ({
    services: initialService && SERVICE_BY_CODE[initialService] ? [initialService] : [],
    emirate: preselect?.emirate ?? "",
    languages: [],
  }));
  const [step, setStep] = useState<Step>("needs");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<MatchView[] | null>(null);
  const [noMatch, setNoMatch] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [contact, setContact] = useState({ contactName: "", contactEmail: "", contactPhone: "", companyName: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [consentDoc, setConsentDoc] = useState<{ version: string; text: string } | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef<number>(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const applicable = useMemo(() => applicableQuestions(answers), [answers]);
  const hasDetails = applicable.some((q) => q.step === "details");
  const steps: Step[] = ["needs", "business", ...(hasDetails ? (["details"] as Step[]) : []), "preferences", "results", "contact"];
  const idx = steps.indexOf(step);

  const set = (id: string, v: string | string[]) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggle = (id: string, v: string) =>
    setAnswers((a) => {
      const cur = (a[id] as string[] | undefined) ?? [];
      return { ...a, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  function validateStep(s: Step): boolean {
    const e: Record<string, string> = {};
    if (s === "needs") {
      if (!(answers.services as string[]).length) e.services = "Choose at least one service";
      if (!answers.emirate) e.emirate = "Choose an emirate";
    }
    for (const q of applicable.filter((q) => q.step === s && q.required)) if (!answers[q.id]) e[q.id] = "Please answer this question";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (step === "preferences") return runMatch();
    setStep(steps[idx + 1]!);
  }

  function runMatch() {
    setFormError(null);
    startTransition(async () => {
      const res = await findMatchesAction(answers);
      if (!res.ok && res.errors.form) {
        setFormError(res.errors.form);
        return;
      }
      if (!res.ok) {
        setErrors(res.errors);
        setFormError("Some answers need attention.");
        const first = Object.keys(res.errors)[0];
        const q = QUESTIONS.find((x) => x.id === first);
        setStep(first === "services" || first === "emirate" || first === "jurisdiction" ? "needs" : (q?.step ?? "needs"));
        return;
      }
      setMatches(res.matches);
      setNoMatch(res.noMatchReasons);
      setSelected(preselect && res.matches.some((m) => m.id === preselect.id) ? [preselect.id] : []);
      setStep("results");
    });
  }

  function goContact() {
    if (selected.length === 0) {
      setErrors({ providers: "Choose at least one provider" });
      return;
    }
    startTransition(async () => {
      setConsentDoc(await consentTextAction(selected));
      setConsent(false);
      setErrors({});
      setStep("contact");
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await submitEnquiryAction({
        answers,
        contact,
        providerIds: selected,
        consent,
        consentVersion: consentDoc?.version ?? "",
        website: honeypot,
        startedAt: startedAt.current,
      });
      if (res.ok) {
        router.push(res.duplicate ? "/enquiry/sent?duplicate=1" : `/enquiry/sent?ref=${encodeURIComponent(res.ref)}`);
        return;
      }
      setFormError(res.message);
      setErrors(res.errors ?? {});
      if (res.errors?.providers) setStep("results");
    });
  }

  const err = (id: string) => (errors[id] ? <div className="error" id={`${id}-error`} role="alert">{errors[id]}</div> : null);

  return (
    <div>
      <ol className="steps" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} aria-current={s === step ? "step" : undefined} className={i < idx ? "done" : undefined}>
            <span className="step-num">{i + 1}.</span> <span className="step-label">{STEP_LABELS[s]}</span>
          </li>
        ))}
      </ol>
      {preselect && step !== "contact" && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          You started from <strong>{preselect.name}</strong>. It will be pre-selected if it matches what you need.
        </div>
      )}
      {formError && <div className="alert alert-bad" role="alert" style={{ marginBottom: 16 }}>{formError}</div>}

      <h2 tabIndex={-1} ref={headingRef} style={{ outline: "none" }}>{STEP_LABELS[step]}</h2>

      {step === "needs" && (
        <div>
          <fieldset aria-describedby={errors.services ? "services-error" : undefined}>
            <legend>Which services do you need?</legend>
            {Object.entries(SERVICE_CATEGORIES).map(([cat, label]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <p className="small muted" style={{ margin: "4px 0" }}>{label}</p>
                <div className="options">
                  {SERVICES.filter((s) => s.category === cat).map((s) => (
                    <label className="option" key={s.code}>
                      <input type="checkbox" checked={(answers.services as string[]).includes(s.code)} onChange={() => toggle("services", s.code)} />
                      <span>{s.name}{s.requiredCredentialTypes.length > 0 && <span className="small muted"> · needs a checked registration</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {err("services")}
          </fieldset>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="emirate">Where is the business based?</label>
              <select id="emirate" value={answers.emirate as string} aria-invalid={!!errors.emirate} onChange={(e) => setAnswers((a) => ({ ...a, emirate: e.target.value, jurisdiction: "" }))}>
                <option value="">Choose an emirate</option>
                {EMIRATES.map((em) => <option key={em.code} value={em.code}>{em.name}</option>)}
              </select>
              {err("emirate")}
            </div>
            <div className="field">
              <label htmlFor="jurisdiction">Free zone or mainland (optional)</label>
              <select id="jurisdiction" value={(answers.jurisdiction as string) ?? ""} onChange={(e) => set("jurisdiction", e.target.value)} disabled={!answers.emirate}>
                <option value="">Not sure / skip</option>
                {JURISDICTIONS.filter((j) => j.emirate === answers.emirate).map((j) => <option key={j.code} value={j.code}>{j.name}</option>)}
              </select>
              {err("jurisdiction")}
            </div>
            <div className="field">
              <label htmlFor="industry">Industry (optional)</label>
              <select id="industry" value={(answers.industry as string) ?? ""} onChange={(e) => set("industry", e.target.value)}>
                <option value="">Skip</option>
                {INDUSTRIES.map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <fieldset>
            <legend>Preferred languages (optional)</legend>
            <div className="options">
              {LANGUAGES.map((l) => (
                <label className="option" key={l.code}>
                  <input type="checkbox" checked={(answers.languages as string[]).includes(l.code)} onChange={() => toggle("languages", l.code)} />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {(step === "business" || step === "details" || step === "preferences") &&
        applicable.filter((q) => q.step === step).map((q) => <QuestionField key={q.id} q={q} value={answers[q.id] as string | undefined} error={errors[q.id]} onChange={(v) => set(q.id, v)} />)}

      {step === "results" && matches && (
        <div>
          {matches.length === 0 ? (
            <div className="card" role="status">
              <h3>No provider can take this enquiry yet</h3>
              <ul>{noMatch.map((r) => <li key={r}>{r}</li>)}</ul>
              <p>You can <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep("needs")}>change your answers</button>, or <Link href="/providers">browse all providers</Link>.</p>
            </div>
          ) : (
            <>
              <p className="muted">Choose up to {MAX_RECIPIENTS} providers to contact. Scores come only from how well each provider fits your answers; nobody can pay to change them. <Link href="/how-ranking-works" target="_blank">How scores work</Link>.</p>
              {err("providers")}
              <div className="stack">
                {matches.map((m) => {
                  const checked = selected.includes(m.id);
                  const disabled = !checked && selected.length >= MAX_RECIPIENTS;
                  return (
                    <div className="card" key={m.id} style={checked ? { borderColor: "var(--brand)" } : undefined}>
                      <div className="row between">
                        <label className="row" style={{ fontWeight: 700, margin: 0, cursor: disabled ? "not-allowed" : "pointer" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                            style={{ width: 20, height: 20, accentColor: "var(--brand)" }}
                          />
                          {m.name}
                        </label>
                        <span className="row" style={{ gap: 8 }}>
                          {m.isSynthetic && <span className="badge badge-neutral">Demo data</span>}
                          <span className="score" aria-label={`Match score ${m.score} out of 100`}>{m.score}/100</span>
                        </span>
                      </div>
                      {m.verified.length > 0 && (
                        <div className="chips" style={{ margin: "8px 0" }}>
                          {m.verified.map((v) => <span key={v} className="badge badge-ok">Verified: {CREDENTIAL_BY_CODE[v]?.name ?? v}</span>)}
                        </div>
                      )}
                      <details>
                        <summary className="small">Why this matched</summary>
                        <ul className="small">
                          {m.reasons.map((r) => <li key={r.label}>{r.label} <span className="muted">(+{r.points})</span></li>)}
                          {m.missingServices.length > 0 && <li>Does not offer: {m.missingServices.map((s) => SERVICE_BY_CODE[s]?.name ?? s).join(", ")}</li>}
                        </ul>
                      </details>
                      <p className="small" style={{ margin: "8px 0 0" }}><Link href={`/providers/${m.slug}`} target="_blank">View profile</Link></p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {step === "contact" && consentDoc && (
        <form onSubmit={submit} noValidate>
          <p className="muted">Your details go only to: <strong>{matches!.filter((m) => selected.includes(m.id)).map((m) => m.name).join(", ")}</strong>.</p>
          <div className="grid grid-2">
            {([
              ["contactName", "Your name", "text", "name", true],
              ["contactEmail", "Work email", "email", "email", true],
              ["contactPhone", "Phone (optional)", "tel", "tel", false],
              ["companyName", "Company (optional)", "text", "organization", false],
            ] as const).map(([id, label, type, ac, req]) => (
              <div className="field" key={id}>
                <label htmlFor={id}>{label}</label>
                <input id={id} type={type} autoComplete={ac} required={req} value={contact[id]} aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-error` : undefined} onChange={(e) => setContact((c) => ({ ...c, [id]: e.target.value }))} />
                {err(id)}
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="message">Anything else providers should know? (optional)</label>
            <textarea id="message" maxLength={2000} value={contact.message} onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))} />
            <div className="help">Please do not include tax identification numbers or financial statements here.</div>
            {err("message")}
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="website">Leave this empty</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
          <label className="option" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-describedby="consent-text" />
            <span id="consent-text">{consentDoc.text}</span>
          </label>
          {err("consent")}
          <p className="small muted">See our <Link href="/privacy" target="_blank">privacy notice</Link>.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep("results")}>Back</button>
            <button type="submit" className="btn" disabled={pending || !consent}>{pending ? "Sending…" : "Send enquiry"}</button>
          </div>
        </form>
      )}

      {step !== "contact" && (
        <div className="row" style={{ marginTop: 24 }}>
          {idx > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(steps[idx - 1]!)}>Back</button>}
          {step === "results" ? (
            matches && matches.length > 0 && <button type="button" className="btn" onClick={goContact} disabled={pending || selected.length === 0}>Continue with {selected.length} selected</button>
          ) : (
            <button type="button" className="btn" onClick={next} disabled={pending}>{step === "preferences" ? (pending ? "Finding matches…" : "See matching providers") : "Continue"}</button>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionField({ q, value, error, onChange }: { q: Question; value: string | undefined; error?: string; onChange: (v: string) => void }) {
  return (
    <fieldset aria-describedby={[q.help ? `${q.id}-help` : "", error ? `${q.id}-error` : ""].join(" ").trim() || undefined}>
      <legend>{q.label}{!q.required && <span className="muted small"> (optional)</span>}</legend>
      {q.help && <p className="small muted" id={`${q.id}-help`} style={{ marginTop: 0 }}>{q.help}</p>}
      <div className="options">
        {q.options.map((o) => (
          <label className="option" key={o.value}>
            <input type="radio" name={q.id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && <div className="error" id={`${q.id}-error`} role="alert">{error}</div>}
    </fieldset>
  );
}
