"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SIGNUP_COUNTRIES } from "@/lib/auth/signup-fields";
export function ImportInquiryForm() {
  const t = useTranslations("importInquiry");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"success" | "failed" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    setPending(true); setStatus(null);
    try {
      const response = await fetch("/api/import-inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), locale }) });
      if (!response.ok) throw new Error("Request failed");
      setStatus("success"); form.reset();
    } catch { setStatus("failed"); } finally { setPending(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm";
  return <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
    <input name="spam_trap" aria-hidden tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" />
    {[["company_name","company"],["contact_name","contact"],["email","email"],["phone","phone"],["product","product"],["brand","brand"],["origin","origin"],["price","price"],["quantity","quantity"],["documents","documents"]].map(([key,label]) => <label key={key} className="text-sm font-medium">{t(label)}{!["price","documents"].includes(key) ? " *" : ""}<input name={key} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} required={!["price","documents"].includes(key)} maxLength={500} className={field} /></label>)}
    <label className="text-sm font-medium">{t("country")} *<select name="country" required className={field} defaultValue=""><option value="">{t("select")}</option>{SIGNUP_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}</select></label>
    <label className="text-sm font-medium sm:col-span-2">{t("message")} *<textarea name="message" required maxLength={5000} rows={5} className={field} /></label>
    <label className="flex items-start gap-3 text-sm sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1" />{t("consent")}</label>
    {status ? <p role="status" className="text-sm sm:col-span-2">{t(status)}</p> : null}
    <button disabled={pending} className="rounded-xl bg-accent px-6 py-3 font-semibold text-white disabled:opacity-50">{pending ? t("processing") : t("submit")}</button>
  </form>;
}
