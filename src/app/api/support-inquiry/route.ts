import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { MAX_SUPPORT_FILE_BYTES, supportFileType } from "@/lib/support-center";
import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml, sendQuoteInquiryEmail } from "@/lib/email";
import { validateSupportInquiry } from "@/lib/support-inquiries";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403, headers });
  const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const maxBody = multipart ? MAX_SUPPORT_FILE_BYTES + 50000 : 30000;
  if (Number(request.headers.get("content-length")) > maxBody) return Response.json({ error: "too_large" }, { status: 413, headers });
  let body: unknown; let attachment: File | null = null;
  try {
    if (!request.body) throw Error('empty');
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > maxBody) { await reader.cancel(); return Response.json({error:'too_large'},{status:413,headers}); } chunks.push(part.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
    if (multipart) {
      const form = await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
      body = JSON.parse(String(form.get('payload') || '{}'));
      const file = form.get('attachment'); if (file instanceof File && file.size) attachment = file;
    } else body = JSON.parse(new TextDecoder().decode(bytes));
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
  const { user, profile } = await getSessionProfile();
  const company = typeof (body as Record<string,unknown>).company_name === 'string' ? String((body as Record<string,unknown>).company_name).trim() : '';
  if (company.length > 200) return Response.json({error:'invalid_fields'},{status:400,headers});
  let attachmentPath: string | null = null;
  if (attachment) {
    if (attachment.size > MAX_SUPPORT_FILE_BYTES) return Response.json({error:'file_size'},{status:413,headers});
    const bytes = new Uint8Array(await attachment.arrayBuffer()), mime = supportFileType(bytes);
    if (!mime || mime !== attachment.type) return Response.json({error:'file_type'},{status:400,headers});
    attachmentPath = data.id + '/' + crypto.randomUUID();
    const uploaded = await client.storage.from('support-attachments').upload(attachmentPath,bytes,{contentType:mime,upsert:false});
    if (uploaded.error) return Response.json({error:'upload_failed'},{status:503,headers});
  }
  const inserted = await client.from("support_inquiries").insert({...data,user_id:user?.id || null,company_name:company || profile?.company_name || null,attachment_path:attachmentPath,attachment_name:attachment?.name.replace(/[\/\r\n<>]/g,'_').slice(0,160) || null});
  if (inserted.error) {
    if (attachmentPath) await client.storage.from("support-attachments").remove([attachmentPath]);
    if (inserted.error.code === "23505") return Response.json({ success: true, reference: data.id }, { headers });
    return Response.json({ error: "save_failed" }, { status: 503, headers });
  }
  // The saved inquiry remains available even if notification delivery fails.
  const text = [`HMT customer support inquiry: ${data.id}`, `Name: ${data.contact_name}`, `Company: ${company || profile?.company_name || "-"}`, `Email: ${data.email}`, `Category: ${data.category}`, `Subject: ${data.subject}`, `Order: ${data.order_number || "-"}`, "", data.message].join("\n");
  try { await sendQuoteInquiryEmail({ subject: `[HMT Support] ${data.subject.replace(/[\r\n]/g, " ")}`, replyTo: data.email, text, html: `<h2>HMT customer support</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(text)}</pre>` }); }
  catch { console.error("[support-inquiry] notification failed; inquiry is saved"); }
  return Response.json({ success: true, reference: data.id }, { headers });
}
