"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { registerProvider } from "@/lib/claims";
import { clientIp, login } from "@/lib/session";
import { CREDENTIAL_BY_CODE } from "@/lib/taxonomy";
import { MAX_CREDENTIALS } from "./constants";

/** Everything the user typed except the password, so the form can be re-filled after an error. */
export type RegisterValues = {
  legalName: string;
  tradeName: string;
  kind: string;
  emirate: string;
  city: string;
  website: string;
  publicEmail: string;
  publicPhone: string;
  description: string;
  services: string[];
  jurisdictions: string[];
  languages: string[];
  contactName: string;
  contactEmail: string;
  credentials: { type: string; registrationNumber: string }[];
  consent: boolean;
};

export type RegisterState = { seq: number; message?: string; errors?: Record<string, string>; values?: RegisterValues; existingSlug?: string };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const list = (fd: FormData, k: string) => fd.getAll(k).filter((v): v is string => typeof v === "string");

export async function register(prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const seq = prev.seq + 1;
  const credentials: RegisterValues["credentials"] = [];
  for (let i = 0; i < MAX_CREDENTIALS; i++) {
    const type = str(formData, `credType${i}`);
    const registrationNumber = str(formData, `credNumber${i}`);
    if (!type && !registrationNumber.trim()) continue;
    credentials.push({ type, registrationNumber });
  }
  const values: RegisterValues = {
    legalName: str(formData, "legalName"),
    tradeName: str(formData, "tradeName"),
    kind: str(formData, "kind"),
    emirate: str(formData, "emirate"),
    city: str(formData, "city"),
    website: str(formData, "website"),
    publicEmail: str(formData, "publicEmail"),
    publicPhone: str(formData, "publicPhone"),
    description: str(formData, "description"),
    services: list(formData, "services"),
    jurisdictions: list(formData, "jurisdictions"),
    languages: list(formData, "languages"),
    contactName: str(formData, "contactName"),
    contactEmail: str(formData, "contactEmail"),
    credentials,
    consent: formData.get("consent") === "on",
  };
  const password = str(formData, "password");

  // Only firm-level registrations are accepted here; registerProvider would silently drop others.
  const credErrors: Record<string, string> = {};
  credentials.forEach((c, i) => {
    if (!c.type) credErrors[`credType${i}`] = "Choose the registration type";
    else if (CREDENTIAL_BY_CODE[c.type]?.subject !== "organization") credErrors[`credType${i}`] = "Choose a firm-level registration";
    if (c.registrationNumber.trim().length < 3) credErrors[`credNumber${i}`] = "Enter the registration number (at least 3 characters)";
  });
  if (password !== str(formData, "passwordConfirm")) credErrors.passwordConfirm = "Passwords do not match";
  if (Object.keys(credErrors).length)
    return { seq, message: "Please correct the highlighted fields. For your security, enter your password again.", errors: credErrors, values };

  let result: Awaited<ReturnType<typeof registerProvider>>;
  try {
    result = await registerProvider(getDb(), { ...values, password }, { ip: await clientIp(), now: new Date() });
  } catch {
    return { seq, message: "Your listing could not be created. Please try again later.", values };
  }
  if (!result.ok) {
    const { form, ...errors } = result.errors as Record<string, string>;
    return {
      seq,
      message: form ?? "Please correct the highlighted fields. For your security, enter your password again.",
      errors,
      values,
      existingSlug: "existingSlug" in result ? result.existingSlug : undefined,
    };
  }

  const signedIn = await login(values.contactEmail, password);
  if (!signedIn.ok) redirect(`/login?error=${encodeURIComponent("Your listing was created and is in review. Please sign in.")}`);
  redirect(
    `/provider?notice=${encodeURIComponent(
      "Thank you. Your listing is in review: it is not visible in the directory yet. We will check your details and registrations before publishing it.",
    )}`,
  );
}
