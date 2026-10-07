export const SUPPORT_CATEGORIES = ["general", "account", "quotation", "product", "other"] as const;
export function validateSupportInquiry(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const values = body as Record<string, unknown>;
  const text = (key: string) => typeof values[key] === "string" ? values[key].trim() : "";
  const data = { id: text("id"), contact_name: text("contact_name"), email: text("email").toLowerCase(), category: text("category"), subject: text("subject"), message: text("message"), order_number: text("order_number") || null, locale: text("locale") || "en" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)) return null;
  if (data.contact_name.length < 2 || data.contact_name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) return null;
  if (!SUPPORT_CATEGORIES.some(category => category === data.category) || data.subject.length < 3 || data.subject.length > 200 || data.message.length < 10 || data.message.length > 5000) return null;
  if ((data.order_number && !/^[A-Za-z0-9-]{4,64}$/.test(data.order_number)) || !["ko", "en", "ja", "zh", "vi", "id", "th"].includes(data.locale) || values.privacy_consent !== true) return null;
  return { data, spam: Boolean(text("spam_trap")) };
}
