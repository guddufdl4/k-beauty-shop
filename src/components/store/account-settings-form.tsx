"use client";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveAccount, closeAccount, changeAccountEmail } from "@/app/actions/account";
import { SIGNUP_COUNTRIES, PHONE_COUNTRIES, callingCode } from "@/lib/auth/signup-fields";
const field = "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm";
export function AccountSettingsForm({ name, company, phone, country, admin }: { name?: string | null; company?: string | null; phone?: string | null; country?: string | null; admin: boolean }) {
  const t = useTranslations("accountSettings");
  const [saved, save, saving] = useActionState(saveAccount, {});
  const [closed, close, closing] = useActionState(closeAccount, {});
  const [emailState, emailAction, emailing] = useActionState(changeAccountEmail, {});
  return <div className="mt-7 space-y-6">
    <section className="rounded-3xl border border-zinc-200 p-6 sm:p-8">
      <h2 className="text-lg font-bold">{t("edit")}</h2>
      <form action={save} className="mt-5 grid gap-4 sm:grid-cols-2">
        {[["full_name", "name", name], ["company_name", "company", company], ["phone_number", "phone", phone]].map(([key, label, value]) => <label key={key} className="text-sm">{t(label!)}<input name={key!} required maxLength={key === "phone_number" ? 30 : 200} type={key === "phone_number" ? "tel" : "text"} defaultValue={value ?? ""} className={field} /></label>)}
        <label className="text-sm">{t("country")}<select name="country_code" defaultValue={country || "KR"} className={field}>{SIGNUP_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label className="text-sm">{t("phoneCountry")}<select name="phone_country" defaultValue={(phone ? parsePhoneNumberFromString(phone)?.country : null) || (PHONE_COUNTRIES.some(c => c.code === country) ? country! : "KR")} className={field}>{PHONE_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({callingCode(c.code)})</option>)}</select></label>
        <p className="text-sm text-zinc-500 sm:col-span-2">{t("emailHelp")}</p>
        {saved.error || saved.success ? <p role="status" className="text-sm sm:col-span-2">{saved.error || saved.success}</p> : null}
        <button disabled={saving} className="rounded-xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? t("processing") : t("save")}</button>
      </form>
    </section>
    <details className="rounded-3xl border border-zinc-200 p-6 sm:p-8"><summary className="cursor-pointer font-semibold">{t("changeEmail")}</summary><form action={emailAction} className="mt-4 space-y-4">
      <p className="text-sm text-zinc-500">{t("emailHelp")}</p>
      <label className="block text-sm">{t("newEmail")}<input name="email" type="email" required maxLength={200} autoComplete="email" className={field} /></label>
      <label className="block text-sm">{t("password")}<input name="password" type="password" autoComplete="current-password" required maxLength={72} className={field} /></label>
      {emailState.error || emailState.success ? <p role="status" className="text-sm">{emailState.error || emailState.success}</p> : null}
      <button disabled={emailing} className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">{emailing ? t("processing") : t("changeEmail")}</button>
    </form></details>
    <details className="rounded-3xl border border-zinc-200 p-6 sm:p-8"><summary className="cursor-pointer font-semibold text-zinc-600">{t("close")}</summary>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{t("closeHelp")}</p>
      {admin ? <p className="mt-3 text-sm">{t("adminProtected")}</p> : <form action={close} className="mt-4 space-y-4">
        <label className="block text-sm">{t("password")}<input name="password" type="password" autoComplete="current-password" required maxLength={72} className={field} /></label>
        <label className="flex items-start gap-3 text-sm"><input name="confirm" type="checkbox" required className="mt-1" />{t("confirm")}</label>
        {closed.error ? <p role="alert" className="text-sm text-red-700">{closed.error}</p> : null}
        <button disabled={closing} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50">{closing ? t("processing") : t("close")}</button>
      </form>}
    </details>
  </div>;
}
