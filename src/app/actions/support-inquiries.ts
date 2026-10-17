"use server";
import { canManageInquiries } from "@/lib/auth/member-access";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml, sendCustomerEmail, sendQuoteInquiryEmail } from '@/lib/email';
import { supportOwnedBy } from '@/lib/support-center';
import { resolveAuthEmailBaseUrl } from '@/lib/site-url';
import { routing } from '@/i18n/routing';
export async function replySupportInquiry(form: FormData): Promise<{error?:string;success?:string}> {
 const {user,profile} = await getSessionProfile();
 if (!user) return {error:'Please sign in. / 로그인이 필요합니다.'};
 const id=String(form.get('id')||''), replyId=String(form.get('reply_id')||''), body=String(form.get('body')||'').trim();
 if (![id,replyId].every(value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) || body.length<2 || body.length>5000) return {error:'Check the message (2–5,000 characters). / 답변 내용을 확인해 주세요.'};
 const db=createServiceClient(); if (!db) return {error:'Service unavailable. / 잠시 후 다시 시도해 주세요.'};
 const {data:inquiry,error}=await db.from('support_inquiries').select('id,user_id,email,subject,locale').eq('id',id).is('deleted_at',null).maybeSingle();
 const staff=canManageInquiries(profile);
 if (error || !inquiry || (!staff&&!supportOwnedBy(inquiry,user.id))) return {error:'Inquiry not found. / 문의를 찾을 수 없습니다.'};
 const existing=await db.from('support_inquiry_replies').select('id,inquiry_id,author_id').eq('id',replyId).maybeSingle();
 if (existing.error) return {error:'Service unavailable.'};
 if (existing.data) return existing.data.inquiry_id===id&&existing.data.author_id===user.id ? {success:'Message already saved. / 이미 저장된 답변입니다.'} : {error:'Invalid request.'};
 const recent=await db.from('support_inquiry_replies').select('id',{count:'exact',head:true}).eq('author_id',user.id).gte('created_at',new Date(Date.now()-60000).toISOString());
 if (recent.error || (recent.count||0)>=5) return {error:'Please try again in one minute. / 1분 후 다시 시도해 주세요.'};
 const inserted=await db.from('support_inquiry_replies').insert({id:replyId,inquiry_id:id,author_id:user.id,body,from_staff:staff});
 if (inserted.error) return {error:'Message was not saved. Please retry. / 답변을 저장하지 못했습니다.'};
 const updated=await db.from('support_inquiries').update({resolved_at:null,last_reply_from_staff:staff,viewed_at:staff?new Date().toISOString():null}).eq('id',id).is('deleted_at',null);
 if(updated.error) console.error('[support] reply saved; status refresh failed');
 const locale=(routing.locales as readonly string[]).includes(inquiry.locale)?inquiry.locale:'en';
 const url=resolveAuthEmailBaseUrl()+'/'+locale+'/contact#my-inquiries';
 const text=`${staff?'HMT Support reply':'Customer follow-up'}: ${inquiry.subject}\nReference: ${id}\n\n${body}\n\n${staff?url:resolveAuthEmailBaseUrl()+'/admin/inquiries?type=support&id='+id}`;
 let delivered=false;
 try {
   if (staff) { const sent=await sendCustomerEmail({to:inquiry.email,subject:'[HMT Support] '+inquiry.subject.replace(/[\r\n]/g,' '),text,html:`<h2>HMT customer support</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(text)}</pre>`}); delivered=sent.ok; }
   else { const sent=await sendQuoteInquiryEmail({subject:'[HMT Support follow-up] '+inquiry.subject.replace(/[\r\n]/g,' '),replyTo:inquiry.email,text,html:`<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`}); delivered=Boolean(sent.ok); }
 } catch { delivered=false; }
 await db.from('support_inquiry_replies').update({email_status:delivered?'sent':'failed'}).eq('id',replyId);

 revalidatePath('/admin/inquiries'); revalidatePath('/[locale]/contact','page');
 return {success:delivered?'Message saved and email notification sent. / 답변 저장 및 이메일 알림 발송 완료.':'Message saved. Email delivery failed; the message is available on the site. / 답변은 저장됐지만 이메일 발송에 실패했습니다.'};
}
export async function updateSupportInquiry(form: FormData) {
  const { user, profile } = await getSessionProfile();
  if (!user || !canManageInquiries(profile)) return { error: "문의 관리 권한이 필요합니다." };
  const id = String(form.get("id"));
  const decision = String(form.get("decision"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["viewed", "resolve", "reopen"].includes(decision)) return { error: "잘못된 요청입니다." };
  const client = createServiceClient();
  if (!client) return { error: "문의를 저장할 수 없습니다." };
  const now = new Date().toISOString();
  const patch = decision === "viewed" ? { viewed_at: now } : { resolved_at: decision === "resolve" ? now : null };
  let query = client.from("support_inquiries").update(patch).eq("id", id).is("deleted_at", null);
  if (decision === "viewed") query = query.is("viewed_at", null);
  const result = await query.select("id");
  if (result.error) return { error: "변경하지 못했습니다. 다시 시도해 주세요." };
  if (!result.data?.length) return { error: "이미 확인되었거나 찾을 수 없는 문의입니다." };
  revalidatePath("/admin/inquiries");
  return { success: "문의 상태를 변경했습니다." };
}
