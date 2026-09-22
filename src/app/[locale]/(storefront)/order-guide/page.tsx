import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "supportPages" });
  return buildStorefrontMetadata({
    locale,
    path: "/order-guide",
    title: t("orderGuideTitle"),
    description: t("orderGuideIntro"),
  });
}

export default async function OrderGuidePage() {
  const [t, tAuth] = await Promise.all([
    getTranslations("supportPages"),
    getTranslations("auth"),
  ]);

  const invoiceFields = [
    t("orderGuideS3FieldTradeTerms"),
    t("orderGuideS3FieldShippingMethod"),
    t("orderGuideS3FieldConsignee"),
    t("orderGuideS3FieldShippingAddress"),
    t("orderGuideS3FieldNotifyParty"),
    t("orderGuideS3FieldContact"),
  ];

  const paymentTerms = [t("orderGuideS4Deposit"), t("orderGuideS4Balance")];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {t("orderGuideEyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {t("orderGuideTitle")}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">{t("orderGuideIntro")}</p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS1Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS1P1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS1P2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS1P3")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS1P4")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS1P5")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS2Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS2P1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS2P2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS2P3")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS3Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS3P1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS3P2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS3P3")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 sm:text-base">
          {invoiceFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS3P4")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS4Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS4P1")}</p>
        <p className="text-sm font-medium text-zinc-800">{t("orderGuideS4PaymentTerms")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 sm:text-base">
          {paymentTerms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS4P2")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS5Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS5P1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS5P2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS5P3")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS6Title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS6P1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS6P2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS6P3")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS6P4")}</p>
      </section>

      <section className="mt-10 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideHelpTitle")}</h2>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideHelpP1")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideHelpP2")}</p>
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideHelpP3")}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {tAuth("signupTitle")}
        </Link>
        <Link
          href="/brands"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("orderCta")}
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("productsCta")}
        </Link>
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("wholesaleCta")}
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("contactCta")}
        </Link>
      </div>
    </main>
  );
}
