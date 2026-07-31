"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

type FormState = {
  error?: string;
  success?: boolean;
};

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500";

export function WholesaleInquiryForm() {
  const t = useTranslations("wholesaleInquiry");
  const locale = useLocale();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      company_name: String(formData.get("company_name") ?? ""),
      contact_name: String(formData.get("contact_name") ?? ""),
      country: String(formData.get("country") ?? ""),
      email: String(formData.get("email") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      interested_brands: String(formData.get("interested_brands") ?? ""),
      estimated_quantity: String(formData.get("estimated_quantity") ?? ""),
      message: String(formData.get("message") ?? ""),
      locale,
      spam_trap: String(formData.get("spam_trap") ?? ""),
    };

    try {
      const response = await fetch("/api/wholesale-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const errorKey = data?.error;
        setState({
          error: errorKey ? t(`errors.${errorKey}` as "errors.company_name_required") : t("errors.submitFailed"),
        });
        return;
      }

      setState({ success: true });
      form.reset();
    } catch {
      setState({ error: t("errors.submitFailed") });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-5">
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="spam_trap">{t("spamTrapLabel")}</label>
        <input id="spam_trap" name="spam_trap" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="company_name" className="block text-sm font-medium text-zinc-900">
            {t("companyName")} <span className="text-rose-600">*</span>
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            required
            maxLength={500}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="contact_name" className="block text-sm font-medium text-zinc-900">
            {t("contactName")} <span className="text-rose-600">*</span>
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            required
            maxLength={500}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-zinc-900">
            {t("country")} <span className="text-rose-600">*</span>
          </label>
          <input id="country" name="country" type="text" required maxLength={500} className={inputClassName} />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-900">
            {t("email")} <span className="text-rose-600">*</span>
          </label>
          <input id="email" name="email" type="email" required maxLength={500} className={inputClassName} />
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-zinc-900">
            {t("whatsapp")}
          </label>
          <input id="whatsapp" name="whatsapp" type="text" maxLength={500} className={inputClassName} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="interested_brands" className="block text-sm font-medium text-zinc-900">
            {t("interestedBrands")} <span className="text-rose-600">*</span>
          </label>
          <input
            id="interested_brands"
            name="interested_brands"
            type="text"
            required
            maxLength={500}
            placeholder={t("interestedBrandsPlaceholder")}
            className={inputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="estimated_quantity" className="block text-sm font-medium text-zinc-900">
            {t("estimatedQuantity")} <span className="text-rose-600">*</span>
          </label>
          <input
            id="estimated_quantity"
            name="estimated_quantity"
            type="text"
            required
            maxLength={500}
            placeholder={t("estimatedQuantityPlaceholder")}
            className={inputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className="block text-sm font-medium text-zinc-900">
            {t("message")} <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            maxLength={5000}
            placeholder={t("messagePlaceholder")}
            className={`${inputClassName} resize-y`}
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">{t("privacyNotice")}</p>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{t("success")}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
