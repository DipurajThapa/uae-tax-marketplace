"use server";

import { getDb } from "@/db/client";
import { requireProvider } from "@/lib/session";
import { updateOwnProfile } from "@/lib/profile";
import { userActor } from "@/lib/audit";

export type ProfileValues = {
  tradeName: string;
  city: string;
  address: string;
  website: string;
  publicEmail: string;
  publicPhone: string;
  description: string;
  sizeBand: string;
  foundedYear: string;
  acceptingEnquiries: boolean;
  languages: string[];
  services: string[];
  jurisdictions: string[];
  industries: string[];
};

export type ProfileState = { seq: number; ok?: boolean; message?: string; errors?: Record<string, string>; values?: ProfileValues };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const list = (fd: FormData, k: string) => fd.getAll(k).filter((v): v is string => typeof v === "string");

export async function saveProfile(prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireProvider();
  const values: ProfileValues = {
    tradeName: str(formData, "tradeName"),
    city: str(formData, "city"),
    address: str(formData, "address"),
    website: str(formData, "website"),
    publicEmail: str(formData, "publicEmail"),
    publicPhone: str(formData, "publicPhone"),
    description: str(formData, "description"),
    sizeBand: str(formData, "sizeBand"),
    foundedYear: str(formData, "foundedYear"),
    acceptingEnquiries: formData.get("acceptingEnquiries") === "on",
    languages: list(formData, "languages"),
    services: list(formData, "services"),
    jurisdictions: list(formData, "jurisdictions"),
    industries: list(formData, "industries"),
  };
  const seq = prev.seq + 1;
  try {
    const res = await updateOwnProfile(getDb(), userActor(user.id), user.organizationId, values, new Date());
    if (!res.ok) return { seq, ok: false, message: "Please correct the highlighted fields.", errors: res.errors, values };
    return { seq, ok: true, message: "Profile saved. Changes show on your public listing straight away when it is published.", values };
  } catch {
    return { seq, ok: false, message: "Your profile could not be saved. Please try again.", values };
  }
}
