"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui";
import { INDUSTRIES, JURISDICTIONS, LANGUAGES, SERVICES, SERVICE_CATEGORIES } from "@/lib/taxonomy";
import { saveProfile, type ProfileState, type ProfileValues } from "./actions";

const SIZE_BANDS = ["1-9", "10-49", "50-249", "250+"];

function Checks({
  name,
  legend,
  options,
  selected,
  error,
}: {
  name: string;
  legend: string;
  options: readonly { code: string; name: string }[];
  selected: string[];
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend>{legend}</legend>
      <div className="options">
        {options.map((o) => (
          <label className="option" key={o.code}>
            <input type="checkbox" name={name} value={o.code} defaultChecked={selected.includes(o.code)} />
            <span>{o.name}</span>
          </label>
        ))}
      </div>
      {error && (
        <div className="form-error" id={`${name}-error`} role="alert">
          {error}
        </div>
      )}
    </fieldset>
  );
}

export function ProfileForm({ initial, maxDescriptionChars }: { initial: ProfileValues; maxDescriptionChars: number }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { seq: 0 });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const inv = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  return (
    <form action={action} key={state.seq} noValidate>
      {state.message && (
        <div className={`alert ${state.ok ? "alert-ok" : "alert-bad"}`} role={state.ok ? "status" : "alert"} style={{ marginBottom: 16 }}>
          {state.message}
        </div>
      )}

      <fieldset>
        <legend>Firm details</legend>
        <Field label="Trading name" name="tradeName" help="Shown publicly and in buyers' consent text. Contact support to change it.">
          <input id="tradeName" type="text" value={v.tradeName} readOnly aria-readonly="true" />
        </Field>
        <div className="grid grid-2" style={{ gap: 0, columnGap: 16 }}>
          <Field label="City (optional)" name="city" error={e.city}>
            <input id="city" name="city" type="text" maxLength={100} defaultValue={v.city} {...inv("city")} />
          </Field>
          <Field label="Address (optional)" name="address" error={e.address}>
            <input id="address" name="address" type="text" maxLength={300} defaultValue={v.address} {...inv("address")} />
          </Field>
          <Field label="Website (optional)" name="website" error={e.website} help="Full address, for example https://example.ae">
            <input id="website" name="website" type="url" maxLength={200} defaultValue={v.website} {...inv("website")} />
          </Field>
          <Field label="Public email (optional)" name="publicEmail" error={e.publicEmail}>
            <input id="publicEmail" name="publicEmail" type="email" maxLength={200} defaultValue={v.publicEmail} {...inv("publicEmail")} />
          </Field>
          <Field label="Public phone (optional)" name="publicPhone" error={e.publicPhone} help="Digits, spaces, + ( ) and - only.">
            <input id="publicPhone" name="publicPhone" type="tel" maxLength={30} defaultValue={v.publicPhone} {...inv("publicPhone")} />
          </Field>
          <Field label="Firm size (optional)" name="sizeBand" error={e.sizeBand}>
            <select id="sizeBand" name="sizeBand" defaultValue={v.sizeBand} {...inv("sizeBand")}>
              <option value="">Not stated</option>
              {SIZE_BANDS.map((s) => (
                <option key={s} value={s}>
                  {s} people
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year founded (optional)" name="foundedYear" error={e.foundedYear}>
            <input id="foundedYear" name="foundedYear" type="number" min={1950} max={2100} defaultValue={v.foundedYear} {...inv("foundedYear")} />
          </Field>
        </div>
        <Field
          label="Description (optional)"
          name="description"
          error={e.description}
          help={`Your plan allows up to ${maxDescriptionChars.toLocaleString("en-US")} characters. Describe your firm factually; do not promise outcomes or savings.`}
        >
          <textarea
            id="description"
            name="description"
            maxLength={maxDescriptionChars}
            defaultValue={v.description}
            aria-describedby={e.description ? "description-error description-help" : "description-help"}
            aria-invalid={e.description ? true : undefined}
            rows={6}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Enquiries</legend>
        <label className="option" style={{ maxWidth: 520 }}>
          <input type="checkbox" name="acceptingEnquiries" defaultChecked={v.acceptingEnquiries} />
          <span>
            Accept new enquiries
            <span className="muted small" style={{ display: "block", fontWeight: 400 }}>
              When off, businesses cannot choose your firm. Existing enquiries are not affected.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset aria-describedby={e.services ? "services-error" : undefined}>
        <legend>Services</legend>
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
        {e.services && (
          <div id="services-error" role="alert" className="form-error">
            {e.services}
          </div>
        )}
      </fieldset>

      <Checks name="jurisdictions" legend="Where you work" options={JURISDICTIONS} selected={v.jurisdictions} error={e.jurisdictions} />
      <Checks name="industries" legend="Industries you serve" options={INDUSTRIES} selected={v.industries} error={e.industries} />
      <Checks name="languages" legend="Languages" options={LANGUAGES} selected={v.languages} error={e.languages} />

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
