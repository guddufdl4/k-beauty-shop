"use client";
import { useRef, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { supportInquiryCopy } from '@/lib/support-inquiry-copy';
import { priceRequestCopy } from '@/lib/store/price-request-copy';

export function ProductPriceInquiry({ productId, name, code, barcode, moq, contactName = '', email = '' }: {
  productId: string; name: string; code?: string | null; barcode?: string | null; moq: number; contactName?: string; email?: string;
}) {
  const locale = useLocale(), t = supportInquiryCopy(locale), p = priceRequestCopy(locale);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [reference, setReference] = useState('');
  const request = useRef<{ signature: string; id: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...values, product_id: productId, quantity: Number(values.quantity), locale,
      category: 'product', subject: `Price inquiry: ${code || name}`.slice(0, 200),
      message: 'Please confirm the latest wholesale price.', privacy_consent: values.privacy_consent === 'on' };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    setPending(true); setError('');
    try {
      const response = await fetch('/api/support-inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: request.current.id }) });
      const result = await response.json();
      if (!response.ok || !result.success) { setError(response.status === 429 ? t.limited : t.failed); return; }
      setReference(result.reference);
    } catch { setError(t.failed); } finally { setPending(false); }
  }
  const field = 'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm';
  return <section id="price-inquiry" className="mt-6 scroll-mt-28 rounded-xl border border-pink-100 bg-pink-50/40 p-5">
    <h2 className="text-lg font-bold">{p.label}</h2><p className="mt-2 text-sm text-zinc-600">{p.hint}</p>
    <div className="mt-4 text-sm"><p>{name}</p>{code ? <p className="mt-1 font-mono text-xs">{code}</p> : null}{barcode ? <p className="mt-1 font-mono text-xs">Barcode: {barcode}</p> : null}</div>
    {reference ? <div role="status" className="mt-4 text-sm text-green-800"><p>{t.success}</p><p className="mt-2 break-all">{t.reference}: {reference}</p><Link href="/contact#my-inquiries" className="mt-3 inline-block underline">{t.cta}</Link></div> :
    <form onSubmit={submit} className="mt-4"><fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">{t.name} *<input name="contact_name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={contactName} className={field}/></label>
      <label className="text-sm">{t.email} *<input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email} className={field}/></label>
      <label className="text-sm sm:col-span-2">{p.quantity} · MOQ {moq}<input name="quantity" type="number" min={Math.max(1,moq)} step={1} defaultValue={Math.max(1,moq)} required className={field}/></label>
      <div className="hidden" aria-hidden="true"><input name="spam_trap" tabIndex={-1} autoComplete="off"/></div>
      <label className="flex items-start gap-2 text-xs leading-5 text-zinc-600 sm:col-span-2"><input name="privacy_consent" type="checkbox" required className="mt-1"/><span>{t.consent} <Link href="/privacy" target="_blank" className="underline">{t.privacy}</Link></span></label>
      <button className="min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? t.sending : p.action}</button>
    </fieldset>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}</form>}
  </section>;
}
