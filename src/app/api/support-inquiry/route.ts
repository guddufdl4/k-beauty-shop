import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml, sendQuoteInquiryEmail } from "@/lib/email";
import { validateSupportInquiry } from "@/lib/support-inquiries";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 30000) return Response.json({ error: "too_large" }, { status: 413, headers });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 30000) return Response.json({ error: "too_large" }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "invalid_json" }, { status: 400, headers }); }
  const result = validateSupportInquiry(body);
  if (!result) return Response.json({ error: "invalid_fields" }, { status: 400, headers });
  const { data } = result;
  if (result.spam) return Response.json({ success: true, reference: data.id }, { headers });
  const client = createServiceClient();
  if (!client) return Response.json({ error: "unavailable" }, { status: 503, headers });
  const duplicate = await client.from("support_inquiries").select("id").eq("id", data.id).maybeSingle();
  if (duplicate.error) return Response.json({ error: "unavailable" }, { status: 503, headers });
  if (duplicate.data) return Response.json({ success: true, reference: data.id }, { headers });
  const recent = await client.from("support_inquiries").select("id", { count: "exact", head: true }).eq("email", data.email).gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  if (recent.error) return Response.json({ error: "unavailable" }, { status: 503, headers });
  if ((recent.count ?? 0) >= 3) return Response.json({ error: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": "300" } });
  const inserted = await client.from("support_inquiries").insert(data);
  if (inserted.error) {
    if (inserted.error.code === "23505") return Response.json({ success: true, reference: data.id }, { headers });
    return Response.json({ error: "save_failed" }, { status: 503, headers });
  }
  // The saved inquiry remains available even if notification delivery fails.
  const text = [`HMT customer support inquiry: ${data.id}`, `Name: ${data.contact_name}`, `Email: ${data.email}`, `Category: ${data.category}`, `Subject: ${data.subject}`, `Order: ${data.order_number || "-"}`, "", data.message].join("\n");
  try { await sendQuoteInquiryEmail({ subject: `[HMT Support] ${data.subject.replace(/[\r\n]/g, " ")}`, replyTo: data.email, text, html: `<h2>HMT customer support</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(text)}</pre>` }); }
  catch { console.error("[support-inquiry] notification failed; inquiry is saved"); }
  return Response.json({ success: true, reference: data.id }, { headers });
}
