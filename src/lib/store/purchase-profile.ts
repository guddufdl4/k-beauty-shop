import { COUNTRY_REGIONS } from "@/lib/auth/country-regions";
export const PURCHASE_PURPOSES = ["retail", "wholesale", "salon", "samples", "other"] as const;
export const SALES_CHANNELS = ["amazon", "aliexpress", "ebay", "shopee", "lazada", "tiktok", "online", "social", "offline", "distribution", "other"] as const;
export type PurchaseProfile = { purchasePurpose: string; purposeOther: string; salesChannel: string; salesCountry: string; salesDetails: string };
export function parsePurchaseProfile(form: FormData): PurchaseProfile | { errorKey: "purposeRequired" | "channelRequired" | "countryRequired" | "detailsRequired" | "invalidDetails" | "storeUrlRequired" } {
  const read = (key: string) => String(form.get(key) ?? "").trim();
  const purpose = read("purchase_purpose");
  if (!(PURCHASE_PURPOSES as readonly string[]).includes(purpose)) return { errorKey: "purposeRequired" };
  const purposeOther = purpose === "other" ? read("purpose_other") : "";
  if (purpose === "other" && !purposeOther) return { errorKey: "detailsRequired" };
  const salesChannel = read("sales_channel");
  const salesCountry = read("sales_country");
  const salesDetails = read("sales_details");
  if (!(SALES_CHANNELS as readonly string[]).includes(salesChannel)) return { errorKey: "channelRequired" };
  if (!COUNTRY_REGIONS.some(country => country.code === salesCountry)) return { errorKey: "countryRequired" };
  if (salesDetails.length < 3) return { errorKey: "detailsRequired" };
  if ([purposeOther, salesDetails].some(value => value.length > 500 || /[\p{Cc}<>]/u.test(value))) return { errorKey: "invalidDetails" };
  if (!["offline", "distribution", "other"].includes(salesChannel) && !hasStoreUrl(salesDetails, salesChannel)) return { errorKey: "storeUrlRequired" };
  return { purchasePurpose: purpose, purposeOther, salesChannel, salesCountry, salesDetails };
}
function hasStoreUrl(details: string, channel: string): boolean {
  return (details.match(/https?:\/\/[^\s,]+/gi) ?? []).some(value => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.hostname.includes(".") && (["online", "social"].includes(channel) || url.pathname !== "/" || !!url.search);
    } catch { return false; }
  });
}
export function readSavedPurchaseProfile(value: unknown): PurchaseProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const profile = value as Record<string, unknown>;
  const form = new FormData();
  for (const [field, key] of Object.entries({ purchase_purpose: "purchasePurpose", purpose_other: "purposeOther", sales_channel: "salesChannel", sales_country: "salesCountry", sales_details: "salesDetails" })) {
    if (typeof profile[key] === "string") form.set(field, profile[key]);
  }
  const parsed = parsePurchaseProfile(form);
  return "errorKey" in parsed ? undefined : parsed;
}
export function purchaseProfileText(profile: PurchaseProfile): string {
  return [`Purchase purpose: ${profile.purchasePurpose}${profile.purposeOther ? ` (${profile.purposeOther})` : ""}`, profile.salesChannel && `Sales channel: ${profile.salesChannel}`, profile.salesCountry && `Sales country: ${profile.salesCountry}`, profile.salesDetails && `Sales destination: ${profile.salesDetails}`].filter(Boolean).join("\n");
}
