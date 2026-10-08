/**
 * Reference taxonomy. These are classification labels, not regulatory facts:
 * no thresholds, rates, deadlines or penalties live here (those belong in
 * reviewer-signed, source-cited articles). Statements about which credential a
 * service requires are recorded in docs/research and must be confirmed by counsel
 * before launch (see TASK_BACKLOG: RG-02).
 */

export type ServiceDef = {
  code: string;
  name: string;
  category: "corporate_tax" | "vat" | "excise" | "einvoicing" | "accounting" | "representation";
  description: string;
  requiredCredentialTypes: string[];
};

export const SERVICE_CATEGORIES: Record<ServiceDef["category"], string> = {
  corporate_tax: "Corporate Tax",
  vat: "VAT",
  excise: "Excise Tax",
  einvoicing: "E-invoicing",
  accounting: "Accounting & bookkeeping",
  representation: "Representation before the FTA",
};

export const SERVICES: ServiceDef[] = [
  { code: "corporate-tax-registration", name: "Corporate Tax registration", category: "corporate_tax", description: "Help registering a business for Corporate Tax with the Federal Tax Authority.", requiredCredentialTypes: [] },
  { code: "corporate-tax-returns", name: "Corporate Tax return preparation", category: "corporate_tax", description: "Preparing and filing Corporate Tax returns.", requiredCredentialTypes: [] },
  { code: "corporate-tax-advisory", name: "Corporate Tax advisory & impact assessment", category: "corporate_tax", description: "Assessing how Corporate Tax applies to a business and its group structure.", requiredCredentialTypes: [] },
  { code: "transfer-pricing", name: "Transfer pricing", category: "corporate_tax", description: "Related-party pricing policies and documentation.", requiredCredentialTypes: [] },
  { code: "free-zone-tax", name: "Free zone tax position", category: "corporate_tax", description: "Reviewing the tax position of a free zone business.", requiredCredentialTypes: [] },
  { code: "vat-registration", name: "VAT registration & deregistration", category: "vat", description: "Registering or deregistering a business for VAT.", requiredCredentialTypes: [] },
  { code: "vat-returns", name: "VAT return preparation", category: "vat", description: "Preparing and filing periodic VAT returns.", requiredCredentialTypes: [] },
  { code: "vat-advisory", name: "VAT advisory", category: "vat", description: "Advice on VAT treatment of supplies and transactions.", requiredCredentialTypes: [] },
  { code: "vat-refunds", name: "VAT refund claims", category: "vat", description: "Preparing VAT refund applications.", requiredCredentialTypes: [] },
  { code: "excise-tax", name: "Excise Tax", category: "excise", description: "Excise Tax registration, returns and advice.", requiredCredentialTypes: [] },
  {
    code: "fta-representation",
    name: "Tax agent representation before the FTA",
    category: "representation",
    description: "Acting as the appointed tax agent for a business in its dealings with the Federal Tax Authority, including audits, disclosures and reconsideration requests.",
    requiredCredentialTypes: ["FTA_TAX_AGENCY", "FTA_TAX_AGENT"],
  },
  { code: "einvoicing-readiness", name: "E-invoicing readiness & advisory", category: "einvoicing", description: "Gap analysis and project planning for e-invoicing adoption.", requiredCredentialTypes: [] },
  {
    code: "einvoicing-asp",
    name: "Accredited e-invoicing service provider",
    category: "einvoicing",
    description: "Exchanging e-invoices as an accredited service provider under the UAE e-invoicing system.",
    requiredCredentialTypes: ["MOF_EINVOICING_ASP"],
  },
  { code: "einvoicing-erp-integration", name: "ERP integration for e-invoicing", category: "einvoicing", description: "Connecting accounting or ERP systems to an e-invoicing service provider.", requiredCredentialTypes: [] },
  { code: "bookkeeping", name: "Bookkeeping", category: "accounting", description: "Ongoing bookkeeping and record keeping.", requiredCredentialTypes: [] },
  { code: "financial-statements", name: "Financial statement preparation", category: "accounting", description: "Preparing financial statements (not a statutory audit).", requiredCredentialTypes: [] },
];

export type CredentialTypeDef = {
  code: string;
  name: string;
  issuer: string;
  subject: "organization" | "professional";
  regulated: boolean;
  recheckDays: number;
  description: string;
};

export const CREDENTIAL_TYPES: CredentialTypeDef[] = [
  // FTA terminology: firms are listed as "juridical-person tax agents" (older pages say "tax agency").
  { code: "FTA_TAX_AGENCY", name: "FTA-listed tax agent (firm)", issuer: "Federal Tax Authority (UAE)", subject: "organization", regulated: true, recheckDays: 90, description: "The firm appears in the Federal Tax Authority's register of tax agents." },
  { code: "FTA_TAX_AGENT", name: "FTA-listed tax agent (individual)", issuer: "Federal Tax Authority (UAE)", subject: "professional", regulated: true, recheckDays: 90, description: "The individual appears in the Federal Tax Authority's register of tax agents." },
  { code: "MOF_EINVOICING_ASP", name: "Accredited E-invoicing Service Provider", issuer: "Ministry of Finance (UAE)", subject: "organization", regulated: true, recheckDays: 90, description: "The firm appears on the Ministry of Finance list of accredited e-invoicing service providers." },
  { code: "ACCA", name: "ACCA member", issuer: "Association of Chartered Certified Accountants", subject: "professional", regulated: false, recheckDays: 365, description: "Professional accountancy membership." },
  { code: "ICAEW_ACA", name: "ICAEW Chartered Accountant (ACA)", issuer: "ICAEW", subject: "professional", regulated: false, recheckDays: 365, description: "Professional accountancy membership." },
  { code: "ICAI_CA", name: "Chartered Accountant (ICAI)", issuer: "Institute of Chartered Accountants of India", subject: "professional", regulated: false, recheckDays: 365, description: "Professional accountancy membership." },
  { code: "US_CPA", name: "Certified Public Accountant (US)", issuer: "US state board of accountancy", subject: "professional", regulated: false, recheckDays: 365, description: "Professional accountancy licence." },
  { code: "CIMA", name: "CIMA / CGMA", issuer: "Chartered Institute of Management Accountants", subject: "professional", regulated: false, recheckDays: 365, description: "Professional accountancy membership." },
  { code: "CIOT_ADIT", name: "ADIT (international tax)", issuer: "Chartered Institute of Taxation (UK)", subject: "professional", regulated: false, recheckDays: 365, description: "International taxation qualification." },
];

export const EMIRATES = [
  { code: "abu-dhabi", name: "Abu Dhabi" },
  { code: "dubai", name: "Dubai" },
  { code: "sharjah", name: "Sharjah" },
  { code: "ajman", name: "Ajman" },
  { code: "umm-al-quwain", name: "Umm Al Quwain" },
  { code: "ras-al-khaimah", name: "Ras Al Khaimah" },
  { code: "fujairah", name: "Fujairah" },
] as const;

export const JURISDICTIONS = [
  ...EMIRATES.map((e) => ({ code: `${e.code}-mainland`, name: `${e.name} mainland`, emirate: e.code, kind: "emirate" })),
  { code: "difc", name: "Dubai International Financial Centre (DIFC)", emirate: "dubai", kind: "financial_free_zone" },
  { code: "adgm", name: "Abu Dhabi Global Market (ADGM)", emirate: "abu-dhabi", kind: "financial_free_zone" },
  { code: "jafza", name: "Jebel Ali Free Zone (JAFZA)", emirate: "dubai", kind: "free_zone" },
  { code: "dmcc", name: "DMCC", emirate: "dubai", kind: "free_zone" },
  { code: "dafz", name: "Dubai Airport Free Zone (DAFZ)", emirate: "dubai", kind: "free_zone" },
  { code: "kezad", name: "KEZAD", emirate: "abu-dhabi", kind: "free_zone" },
  { code: "saif-zone", name: "Sharjah Airport International Free Zone (SAIF Zone)", emirate: "sharjah", kind: "free_zone" },
  { code: "shams", name: "Sharjah Media City (Shams)", emirate: "sharjah", kind: "free_zone" },
  { code: "rakez", name: "RAK Economic Zone (RAKEZ)", emirate: "ras-al-khaimah", kind: "free_zone" },
  { code: "ajman-free-zone", name: "Ajman Free Zone", emirate: "ajman", kind: "free_zone" },
] as const;

export const INDUSTRIES = [
  { code: "real-estate", name: "Real estate" },
  { code: "construction", name: "Construction & contracting" },
  { code: "retail-ecommerce", name: "Retail & e-commerce" },
  { code: "hospitality", name: "Hospitality & F&B" },
  { code: "healthcare", name: "Healthcare" },
  { code: "technology", name: "Technology & software" },
  { code: "financial-services", name: "Financial services" },
  { code: "manufacturing", name: "Manufacturing" },
  { code: "trading-logistics", name: "Trading & logistics" },
  { code: "professional-services", name: "Professional services" },
  { code: "energy", name: "Energy & natural resources" },
  { code: "holding", name: "Holding companies & family offices" },
] as const;

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ur", name: "Urdu" },
  { code: "ml", name: "Malayalam" },
  { code: "ta", name: "Tamil" },
  { code: "tl", name: "Filipino" },
  { code: "fa", name: "Persian" },
  { code: "fr", name: "French" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "de", name: "German" },
] as const;

export const ORG_KIND_LABELS: Record<string, string> = {
  tax_agency: "Tax agency",
  accounting_firm: "Accounting & advisory firm",
  einvoicing_provider: "E-invoicing provider",
  law_firm: "Law firm",
  independent_consultant: "Independent consultant",
};

const byCode = <T extends { code: string; name: string }>(list: readonly T[]) =>
  Object.fromEntries(list.map((x) => [x.code, x])) as Record<string, T>;

export const SERVICE_BY_CODE = byCode(SERVICES);
export const CREDENTIAL_BY_CODE = byCode(CREDENTIAL_TYPES);
export const EMIRATE_BY_CODE = byCode(EMIRATES);
export const JURISDICTION_BY_CODE = byCode(JURISDICTIONS);
export const INDUSTRY_BY_CODE = byCode(INDUSTRIES);
export const LANGUAGE_BY_CODE = byCode(LANGUAGES);

export const isEmirate = (c: string) => Object.hasOwn(EMIRATE_BY_CODE, c);
export const isService = (c: string) => Object.hasOwn(SERVICE_BY_CODE, c);
