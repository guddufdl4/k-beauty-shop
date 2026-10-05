import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml, sendQuoteInquiryEmail } from "@/lib/email";
import { looksLikeEmail } from "@/lib/auth/signup-fields";
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 30000) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return new Response(null, { status: 400 });
  if (body.spam_trap) return Response.json({ success: true });
  const fields = ["company_name", "contact_name", "email", "phone", "country", "product", "brand", "origin", "price", "quantity", "documents", "message"];
  const data: Record<string,string> = {};
  for (const key of fields) {
    data[key] = typeof body[key] === "string" ? body[key].trim() : "";
    if ((!data[key] && !["price","documents"].includes(key)) || data[key].length > (key === "message" ? 5000 : 500)) return new Response(null, { status: 400 });
  }
  if (!looksLikeEmail(data.email) || body.consent !== "on") return new Response(null, { status: 400 });
  const service = createServiceClient();
  if (!service) return new Response(null, { status: 503 });
  // Server-only storage separates overseas supplier proposals from wholesale buyer inquiries.
  const text = fields.map(key => `${key}: ${data[key]}`).join("\n");
  const stored = await service.from("import_inquiries").insert({ ...data, locale: ["en","ko","ja","zh"].includes(String(body.locale)) ? body.locale : "en" });
  if (stored.error) return new Response(null, { status: 503 });
  await sendQuoteInquiryEmail({ subject: `[HMT] Import to Korea proposal · ${data.company_name}`, text, html: `<h2>Import to Korea proposal</h2><p>${escapeHtml(text).replaceAll("\n","<br/>")}</p>`, replyTo: data.email });
  return Response.json({ success: true });
}
