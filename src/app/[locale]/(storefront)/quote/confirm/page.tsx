import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOrderByNumber } from "@/lib/cart";
import { getPublicSiteContact, getSiteSettings } from "@/lib/site-settings";
import { mapOrderStatusToQuoteDisplay } from "@/lib/store/quote-status";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "checkout" });
  return buildStorefrontMetadata({
    locale,
    path: "/quote/confirm",
    title: t("successTitle"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function QuoteConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; mail?: string; mock?: string }>;
}) {
  const [{ n, mail, mock }, t, settings] = await Promise.all([
    searchParams,
    getTranslations("checkout"),
    getSiteSettings(),
  ]);
  const contact = getPublicSiteContact(settings);
  const emailSent = mail === "1";
  const mockMode = process.env.NODE_ENV !== "production" && mock === "1";
  const orderNumber = n?.trim() || (mockMode ? "QT-20261005-0001" : "");
  const loaded = orderNumber && !mockMode ? await getOrderByNumber(orderNumber) : null;
  if (!mockMode && !loaded?.order) {
    notFound();
  }
  const submittedAt = loaded?.order?.created_at
    ? String(loaded.order.created_at).slice(0, 10)
    : mockMode
      ? "2026-10-05"
      : null;
  const items =
    loaded?.order?.items.map((item) => ({
      name: item.product_name,
      code:
        ("product_code" in item && typeof item.product_code === "string" && item.product_code) ||
        item.product_sku,
      quantity: item.quantity,
    })) ??
    (mockMode
      ? [{ name: "Sample wholesale item", code: "HMT-000001", quantity: 12 }]
      : []);
  const status = loaded?.order ? mapOrderStatusToQuoteDisplay(loaded.order.status) : "submitted";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("successTitle")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("successBody")}</p>
      {emailSent ? <p className="mt-3 text-sm text-zinc-700">{t("emailSentNote")}</p> : null}
      {!emailSent ? <p className="mt-3 text-sm text-zinc-700">{t("emailNotSentNote")}</p> : null}

      <dl className="mt-8 space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm">
        <div>
          <dt className="text-zinc-500">{t("quoteNumber")}</dt>
          <dd className="font-mono font-semibold">{orderNumber || t("quoteNumberPending")}</dd>
        </div>
        {submittedAt ? (
          <div>
            <dt className="text-zinc-500">{t("submittedAt")}</dt>
            <dd>{submittedAt}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-zinc-500">{t("quoteStatusLabel")}</dt>
          <dd>{t(`quoteStatus.${status}`)}</dd>
        </div>
      </dl>

      {items.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item, index) => (
              <li key={`${item.code}-${index}`} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">
                  {item.code} · {item.quantity}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 space-y-2 text-sm text-zinc-600">
        <h2 className="text-lg font-semibold text-zinc-900">{t("nextStepsTitle")}</h2>
        <p>{t("nextStepsBody")}</p>
        <p>{t("responseTimeBody")}</p>
      </section>

      <section className="mt-8 space-y-1 text-sm text-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-900">{t("contactTitle")}</h2>
        {contact.public_email ? <p>{contact.public_email}</p> : null}
        {contact.public_whatsapp ? <p>WhatsApp {contact.public_whatsapp}</p> : null}
        {contact.public_phone ? <p>{contact.public_phone}</p> : null}
      </section>

      <Link
        href="/products"
        className="mt-8 inline-flex rounded-xl bg-violet-700 px-5 py-2.5 font-semibold text-white hover:bg-violet-800"
      >
        {t("continueShopping")}
      </Link>
    </main>
  );
}
