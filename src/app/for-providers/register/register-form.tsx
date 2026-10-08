"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/ui";
import { CREDENTIAL_TYPES, EMIRATES, JURISDICTIONS, LANGUAGES, ORG_KIND_LABELS, SERVICES, SERVICE_CATEGORIES } from "@/lib/taxonomy";
import { register, type RegisterState, type RegisterValues } from "./actions";
import { DESCRIPTION_MAX, MAX_CREDENTIALS } from "./constants";

const ORG_CREDENTIALS = CREDENTIAL_TYPES.filter((t) => t.subject === "organization");

const EMPTY: RegisterValues = {
  legalName: "",
  tradeName: "",
  kind: "",
  emirate: "",
  city: "",
  website: "",
  publicEmail: "",
  publicPhone: "",
  description: "",
  services: [],
  jurisdictions: [],
  languages: [],
  contactName: "",
  contactEmail: "",
  credentials: [],
  consent: false,
};

function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" className="small" style={{ color: "var(--bad)", marginTop: 8 }}>
      {children}
    </div>
  );
}

export function RegisterForm({ consentText }: { consentText: string }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, { seq: 0 });
  const v = state.values ?? EMPTY;
  const e = state.errors ?? {};
  const inv = (k: string, help = false) =>
    e[k] ? { "aria-invalid": true as const, "aria-describedby": help ? `${k}-error ${k}-help` : `${k}-error` } : help ? { "aria-describedby": `${k}-help` } : {};

  return (
    <form action={action} key={state.seq} noValidate>
      {state.message && (
        <div className="alert alert-bad" role="alert" style={{ marginBottom: 16 }}>
          {state.message}
          {state.existingSlug && (
            <p style={{ margin: "8px 0 0" }}>
              <Link href={`/providers/${state.existingSlug}`}>Open the existing listing to claim it</Link>
            </p>
          )}
        </div>
      )}

      <fieldset>
        <legend>Your firm</legend>
        <Field label="Legal name" name="legalName" error={e.legalName} help="As shown on your trade licence.">
          <input id="legalName" name="legalName" type="text" required maxLength={200} defaultValue={v.legalName} autoComplete="organization" {...inv("legalName", true)} />
        </Field>
        <Field label="Trading name (optional)" name="tradeName" error={e.tradeName}>
          <input id="tradeName" name="tradeName" type="text" maxLength={200} defaultValue={v.tradeName} {...inv("tradeName")} />
        </Field>
        <div className="grid grid-2" style={{ gap: 0, columnGap: 16 }}>
          <Field label="Type of firm" name="kind" error={e.kind}>
            <select id="kind" name="kind" required defaultValue={v.kind} {...inv("kind")}>
              <option value="" disabled>
                Choose a type
              </option>
              {Object.entries(ORG_KIND_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Emirate of your main office" name="emirate" error={e.emirate}>
            <select id="emirate" name="emirate" required defaultValue={v.emirate} {...inv("emirate")}>
              <option value="" disabled>
                Choose an emirate
              </option>
              {EMIRATES.map((em) => (
                <option key={em.code} value={em.code}>
                  {em.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City (optional)" name="city" error={e.city}>
            <input id="city" name="city" type="text" maxLength={100} defaultValue={v.city} autoComplete="address-level2" {...inv("city")} />
          </Field>
          <Field label="Website (optional)" name="website" error={e.website} help="Full address, for example https://example.ae">
            <input id="website" name="website" type="url" maxLength={200} defaultValue={v.website} autoComplete="url" {...inv("website", true)} />
          </Field>
          <Field label="Public email" name="publicEmail" error={e.publicEmail} help="Shown on your listing.">
            <input id="publicEmail" name="publicEmail" type="email" required maxLength={200} defaultValue={v.publicEmail} {...inv("publicEmail", true)} />
          </Field>
          <Field label="Public phone (optional)" name="publicPhone" error={e.publicPhone} help="Digits, spaces, + ( ) and - only.">
            <input id="publicPhone" name="publicPhone" type="tel" maxLength={30} defaultValue={v.publicPhone} {...inv("publicPhone", true)} />
          </Field>
        </div>
        <Field
          label="Short description (optional)"
          name="description"
          error={e.description}
          help={`Up to ${DESCRIPTION_MAX} characters. Describe what your firm does, factually. Do not promise outcomes or savings.`}
        >
          <textarea id="description" name="description" maxLength={DESCRIPTION_MAX} defaultValue={v.description} rows={4} {...inv("description", true)} />
        </Field>
      </fieldset>

      <fieldset aria-describedby={e.services ? "services-error" : undefined}>
        <legend>Services you offer</legend>
        <p className="small muted" style={{ marginTop: 0 }}>
          Some services are matched only once a related registration is verified.
        </p>
        {(Object.keys(SERVICE_CATEGORIES) as (keyof typeof SERVICE_CATEGORIES)[]).map((cat) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <h3 className="small" style={{ margin: "8px 0" }}>
              {SERVICE_CATEGORIES[cat]}
            </h3>
            <div className="options">
              {SERVICES.filter((s) => s.category === cat).map((s) => (
                <label className="option" key={s.code}>
                  <input type="checkbox" name="services" value={s.code} defaultChecked={v.services.includes(s.code)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <ErrorText id="services-error">{e.services}</ErrorText>
      </fieldset>

      <fieldset aria-describedby={e.jurisdictions ? "jurisdictions-error" : undefined}>
        <legend>Where you work (optional)</legend>
        <div className="options">
          {JURISDICTIONS.map((j) => (
            <label className="option" key={j.code}>
              <input type="checkbox" name="jurisdictions" value={j.code} defaultChecked={v.jurisdictions.includes(j.code)} />
              <span>{j.name}</span>
            </label>
          ))}
        </div>
        <ErrorText id="jurisdictions-error">{e.jurisdictions}</ErrorText>
      </fieldset>

      <fieldset aria-describedby={e.languages ? "languages-error" : undefined}>
        <legend>Languages your team works in (optional)</legend>
        <div className="options">
          {LANGUAGES.map((l) => (
            <label className="option" key={l.code}>
              <input type="checkbox" name="languages" value={l.code} defaultChecked={v.languages.includes(l.code)} />
              <span>{l.name}</span>
            </label>
          ))}
        </div>
        <ErrorText id="languages-error">{e.languages}</ErrorText>
      </fieldset>

      <fieldset aria-describedby={e.credentials ? "credentials-error" : undefined}>
        <legend>Firm registrations (optional)</legend>
        <p className="small muted" style={{ marginTop: 0 }}>
          Add up to {MAX_CREDENTIALS}. Each one is checked by hand against an official source before a badge shows on your listing. Individual qualifications
          can be added later.
        </p>
        {Array.from({ length: MAX_CREDENTIALS }, (_, i) => {
          const c = v.credentials[i];
          return (
            <div className="grid grid-2" key={i} style={{ gap: 0, columnGap: 16 }}>
              <Field label={`Registration ${i + 1}: type`} name={`credType${i}`} error={e[`credType${i}`]}>
                <select id={`credType${i}`} name={`credType${i}`} defaultValue={c?.type ?? ""} {...inv(`credType${i}`)}>
                  <option value="">None</option>
                  {ORG_CREDENTIALS.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.issuer})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Registration ${i + 1}: number`} name={`credNumber${i}`} error={e[`credNumber${i}`]}>
                <input
                  id={`credNumber${i}`}
                  name={`credNumber${i}`}
                  type="text"
                  maxLength={50}
                  autoComplete="off"
                  defaultValue={c?.registrationNumber ?? ""}
                  {...inv(`credNumber${i}`)}
                />
              </Field>
            </div>
          );
        })}
        <ErrorText id="credentials-error">{e.credentials}</ErrorText>
      </fieldset>

      <fieldset>
        <legend>Your account</legend>
        <p className="small muted" style={{ marginTop: 0 }}>
          You use this to sign in and manage the listing. Enquiry notifications are sent to this email.
        </p>
        <div className="grid grid-2" style={{ gap: 0, columnGap: 16 }}>
          <Field label="Your name" name="contactName" error={e.contactName}>
            <input id="contactName" name="contactName" type="text" required maxLength={100} defaultValue={v.contactName} autoComplete="name" {...inv("contactName")} />
          </Field>
          <Field label="Your work email" name="contactEmail" error={e.contactEmail}>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              maxLength={200}
              defaultValue={v.contactEmail}
              autoComplete="email"
              {...inv("contactEmail")}
            />
          </Field>
          <Field label="Password" name="password" error={e.password} help="At least 12 characters.">
            <input id="password" name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" {...inv("password", true)} />
          </Field>
          <Field label="Repeat password" name="passwordConfirm" error={e.passwordConfirm}>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={12}
              maxLength={200}
              autoComplete="new-password"
              {...inv("passwordConfirm")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset aria-describedby={e.consent ? "consent-error" : undefined}>
        <legend>Confirmation</legend>
        <label className="option">
          <input type="checkbox" name="consent" required defaultChecked={v.consent} aria-invalid={e.consent ? true : undefined} />
          <span style={{ fontWeight: 400 }}>{consentText}</span>
        </label>
        <ErrorText id="consent-error">{e.consent}</ErrorText>
      </fieldset>

      <p className="small muted">New listings are reviewed before they appear in the directory. Nothing is charged to list your firm.</p>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit listing for review"}
      </button>
    </form>
  );
}
