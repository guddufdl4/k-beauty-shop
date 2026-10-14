export const QUOTE_DRAFT_FIELDS = ["purchase_purpose", "purpose_other", "sales_channel", "sales_country", "sales_details", "company_name", "country", "contact_name", "email", "phone", "shipping_address", "trade_terms", "shipping_method", "trade_terms_etc", "shipping_method_etc", "message"] as const;
export function readQuoteDraft(value: string | null, now = Date.now()): Record<string,string> | null {
  try {
    const data = JSON.parse(value || "null");
    if (!data || !Number.isFinite(data.at) || data.at > now || now - data.at > 12 * 60 * 60 * 1000 || !data.fields || typeof data.fields !== "object") return null;
    return Object.fromEntries(QUOTE_DRAFT_FIELDS.filter(name => typeof data.fields[name] === "string").map(name => [name, data.fields[name].slice(0, name === "message" ? 5000 : 500)]));
  } catch {return null;}
}
