"use client";
import centralCopy from "@/data/central-asian-ui-copy.json";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SUPPORT_CATEGORIES } from "@/lib/support-inquiries";
import { supportInquiryCopy } from "@/lib/support-inquiry-copy";

export function SupportInquiryForm({ name = "", email = "", company = "" }: { name?: string; email?: string; company?:string }) {
  const locale = useLocale();
  const router=useRouter();
  const t = supportInquiryCopy(locale);
  const contactCopy = centralCopy[locale as keyof typeof centralCopy]?.contact ?? ({
    ko: { label: "전화번호 / WhatsApp · Viber · Line (선택)", hint: "연락 가능한 앱 이름과 국가번호를 포함한 전화번호 또는 ID를 적어 주세요.", consent: "선택 입력한 연락처를 문의 답변에 사용하는 것에 동의합니다." },
    en: { label: "Phone / WhatsApp · Viber · Line (optional)", hint: "Include the app name and your phone number with country code, or your ID.", consent: "I consent to using my optional contact details to reply to this inquiry." },
    ja: { label: "電話番号 / WhatsApp・Viber・Line（任意）", hint: "アプリ名と国番号付きの電話番号、またはIDをご入力ください。", consent: "任意の連絡先をお問い合わせへの返信に使用することに同意します。" },
    zh: { label: "电话 / WhatsApp · Viber · Line（选填）", hint: "请填写应用名称及含国家代码的电话号码，或您的账号ID。", consent: "我同意使用选填的联系方式回复本次咨询。" },
    vi: { label: "Điện thoại / WhatsApp · Viber · Line (tùy chọn)", hint: "Nhập tên ứng dụng và số điện thoại có mã quốc gia hoặc ID của bạn.", consent: "Tôi đồng ý sử dụng thông tin liên hệ tùy chọn để trả lời yêu cầu này." },
    id: { label: "Telepon / WhatsApp · Viber · Line (opsional)", hint: "Cantumkan nama aplikasi dan nomor telepon dengan kode negara, atau ID Anda.", consent: "Saya menyetujui penggunaan kontak opsional untuk membalas pertanyaan ini." },
    th: { label: "โทรศัพท์ / WhatsApp · Viber · Line (ไม่บังคับ)", hint: "ระบุชื่อแอปและหมายเลขโทรศัพท์พร้อมรหัสประเทศ หรือ ID ของคุณ", consent: "ฉันยินยอมให้ใช้ข้อมูลติดต่อเพิ่มเติมเพื่อตอบคำถามนี้" },
  } as const)[locale as "ko" | "en" | "ja" | "zh" | "vi" | "id" | "th"] ?? {label:"Additional reply contact (optional)",hint:"Include your country code or messaging ID.",consent:"I consent to the use of this contact to answer my inquiry."};
  const requestId = useRef<{ signature: string; id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const payload = { ...Object.fromEntries(form), locale, privacy_consent: form.get("privacy_consent") === "on" };
    const file=form.get("attachment");
    if(file instanceof File && file.size>3*1024*1024){setError(locale==="ko"?"첨부파일은 3MB 이하로 선택해 주세요.":"Choose an attachment up to 3 MB.");return;}
    const signature = JSON.stringify(payload)+(file instanceof File ? `${file.name}:${file.size}:${file.lastModified}` : "");
    if (requestId.current?.signature !== signature) requestId.current = { signature, id: crypto.randomUUID() };
    const id = requestId.current.id;
    setPending(true); setError("");
    try {
      const upload=new FormData(); upload.set("payload",JSON.stringify({...payload,id})); if(file instanceof File && file.size)upload.set("attachment",file);
      const response = await fetch("/api/support-inquiry", { method: "POST", body:upload });
      const result = await response.json();
      if (!response.ok || !result.success) { setError(response.status === 429 ? t.limited : ["file_size","too_large"].includes(result.error) ? (locale==="ko"?"첨부파일은 3MB 이하로 선택해 주세요.":"Choose an attachment up to 3 MB.") : result.error==="file_type" ? (locale==="ko"?"실제 PDF, JPG, PNG 파일을 선택해 주세요.":"Choose a valid PDF, JPG or PNG file.") : t.failed); return; }
      setReference(result.reference || id); router.refresh();
    } catch { setError(t.failed); }
    finally { setPending(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100";
  return <section id="inquiry" className="order-2 scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 lg:order-none">
    <h2 className="text-xl font-bold">{t.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{t.intro}</p>
    {reference ? <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><p>{t.success}</p><p className="mt-3 text-xs">{t.reference}</p><p className="mt-1 break-all font-mono text-sm font-semibold">{reference}</p><a href="#my-inquiries" className="mt-4 inline-block text-sm font-semibold underline">{locale==="ko"?"내 문의함 보기":"My inquiries"} →</a><button type="button" onClick={()=>{setReference("");requestId.current=null;}} className="ml-4 mt-4 text-sm underline">{locale==="ko"?"새 문의 작성":"New inquiry"}</button></div> :
      <form onSubmit={submit} className="mt-6">
        <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">{locale==="ko"?"회사·상점명":"Company / store name"}<input name="company_name" autoComplete="organization" defaultValue={company} maxLength={200} className={field}/></label>
          <label className="text-sm font-medium">{t.name} *<input name="contact_name" autoComplete="name" defaultValue={name} required minLength={2} maxLength={100} className={field} /></label>
          <label className="text-sm font-medium">{t.email} *<input name="email" type="email" autoComplete="email" defaultValue={email} required maxLength={254} className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{contactCopy.label}<input name="reply_contact" type="text" maxLength={300} aria-describedby="reply-contact-hint" placeholder="WhatsApp +82 10 1234 5678 / Line ID" className={field} /><span id="reply-contact-hint" className="mt-2 block text-xs font-normal leading-5 text-zinc-500">{contactCopy.hint}</span></label>
          <label className="text-sm font-medium">{t.category} *<select name="category" className={field}>{SUPPORT_CATEGORIES.map(category => <option key={category} value={category}>{t[category]}</option>)}</select></label>
          <label className="text-sm font-medium">{t.order}<input name="order_number" maxLength={64} pattern="[A-Za-z0-9-]{4,64}" placeholder="QT-20261005-0001" className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.subject} *<input name="subject" required minLength={3} maxLength={200} className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.message} *<textarea name="message" required minLength={10} maxLength={5000} rows={6} className={field + " resize-y"} /></label>
          <label className="text-sm font-medium sm:col-span-2">{locale==="ko"?"첨부파일 (선택)":"Attach a file (optional)"}<input type="file" name="attachment" accept="application/pdf,image/jpeg,image/png" className={field+" border-dashed"}/><span className="mt-2 block text-xs text-zinc-500">PDF · JPG · PNG / 3 MB {locale==="ko"?"이하. 불필요한 개인정보는 가려 주세요.":"maximum. Mask unnecessary personal information."}</span><Link href="/account#business-verification" className="mt-2 inline-block text-xs font-normal text-accent underline">{locale==="ko"?"사업자 인증 자료는 마이페이지에서 제출해 주세요.":"For business verification, submit documents in My account."}</Link></label>
          <div className="hidden" aria-hidden="true"><label>Website<input name="spam_trap" tabIndex={-1} autoComplete="off" /></label></div>
          <div className="sm:col-span-2"><label className="flex items-start gap-3 text-sm leading-6 text-zinc-600"><input name="privacy_consent" type="checkbox" required className="mt-1 shrink-0 accent-violet-700" /><span>{t.consent} {contactCopy.consent}</span></label><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-violet-700 underline">{t.privacy}</Link></div>
          <button type="submit" className="min-h-12 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? t.sending : t.submit}</button>
        </fieldset>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      </form>}
  </section>;
}
