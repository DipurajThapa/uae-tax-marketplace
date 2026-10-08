import { sha256 } from "./crypto";

/**
 * Versioned consent texts. Changing wording requires a new version; old versions stay
 * so stored consents remain interpretable. Wording is a DRAFT pending counsel review
 * (TASK_BACKLOG RG-04, PDPL).
 */
export const ENQUIRY_CONSENT_VERSION = "enquiry-v1-draft";

export function enquiryConsentText(recipientNames: string[]): string {
  return [
    `I agree that the details and answers I entered will be shared with ${recipientNames.join(", ")} so they can contact me about my enquiry.`,
    "I understand the directory keeps a record of this enquiry for up to 12 months and that I can withdraw it and have my details erased at any time using the link in the confirmation email.",
    "I understand the directory does not give tax advice.",
  ].join(" ");
}

export const consentHash = (text: string) => sha256(text);

export const PROVIDER_LISTING_CONSENT_VERSION = "listing-v1-draft";
export const PROVIDER_LISTING_CONSENT_TEXT =
  "I confirm I am authorised to list this business, that the information I give is accurate, and I agree that the business details, services and registration numbers I submit may be checked against official registers and shown publicly on the directory.";
