"use client";
import { useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SUPPORT_CATEGORIES } from "@/lib/support-inquiries";
import { supportInquiryCopy } from "@/lib/support-inquiry-copy";

export function SupportInquiryForm({ name = "", email = "" }: { name?: string; email?: string }) {
  const locale = useLocale();
  const t = supportInquiryCopy(locale);
  const requestId = useRef<{ signature: string; id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const payload = { ...Object.fromEntries(form), locale, privacy_consent: form.get("privacy_consent") === "on" };
    const signature = JSON.stringify(payload);
    if (requestId.current?.signature !== signature) requestId.current = { signature, id: crypto.randomUUID() };
    const id = requestId.current.id;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/support-inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id }) });
      const result = await response.json();
      if (!response.ok || !result.success) { setError(response.status === 429 ? t.limited : t.failed); return; }
      setReference(result.reference || id);
    } catch { setError(t.failed); }
    finally { setPending(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  return <section id="inquiry" className="mt-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-5 sm:p-8">
    <h2 className="text-xl font-bold">{t.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{t.intro}</p>
    {reference ? <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><p>{t.success}</p><p className="mt-3 text-xs">{t.reference}</p><p className="mt-1 break-all font-mono text-sm font-semibold">{reference}</p></div> :
      <form onSubmit={submit} className="mt-6">
        <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.name} *<input name="contact_name" autoComplete="name" defaultValue={name} required minLength={2} maxLength={100} className={field} /></label>
          <label className="text-sm font-medium">{t.email} *<input name="email" type="email" autoComplete="email" defaultValue={email} required maxLength={254} className={field} /></label>
          <label className="text-sm font-medium">{t.category} *<select name="category" className={field}>{SUPPORT_CATEGORIES.map(category => <option key={category} value={category}>{t[category]}</option>)}</select></label>
          <label className="text-sm font-medium">{t.order}<input name="order_number" maxLength={64} pattern="[A-Za-z0-9-]{4,64}" placeholder="QT-20261005-0001" className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.subject} *<input name="subject" required minLength={3} maxLength={200} className={field} /></label>
          <label className="text-sm font-medium sm:col-span-2">{t.message} *<textarea name="message" required minLength={10} maxLength={5000} rows={6} className={field + " resize-y"} /></label>
          <div className="hidden" aria-hidden="true"><label>Website<input name="spam_trap" tabIndex={-1} autoComplete="off" /></label></div>
          <div className="sm:col-span-2"><label className="flex items-start gap-3 text-sm leading-6 text-zinc-600"><input name="privacy_consent" type="checkbox" required className="mt-1 shrink-0 accent-violet-700" />{t.consent}</label><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-violet-700 underline">{t.privacy}</Link></div>
          <button type="submit" className="min-h-12 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? t.sending : t.submit}</button>
        </fieldset>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      </form>}
  </section>;
}
