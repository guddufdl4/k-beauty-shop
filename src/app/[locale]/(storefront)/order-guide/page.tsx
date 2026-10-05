import { SupportPageShell } from "@/components/store/support-page-shell";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { getPublicSiteContact, getSiteSettings } from "@/lib/site-settings";

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
  const [t, tAuth, settings] = await Promise.all([
    getTranslations("supportPages"),
    getTranslations("auth"),
    getSiteSettings(),
  ]);
  const contact = getPublicSiteContact(settings);

  const invoiceFields = [
    t("orderGuideS3FieldTradeTerms"),
    t("orderGuideS3FieldShippingMethod"),
    t("orderGuideS3FieldConsignee"),
    t("orderGuideS3FieldShippingAddress"),
    t("orderGuideS3FieldNotifyParty"),
    t("orderGuideS3FieldContact"),
  ];

  return (
    <SupportPageShell activeHref="/order-guide" title={t("orderGuideTitle")}>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {t("orderGuideEyebrow")}
      </p>

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
        <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS4P2")}</p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("orderGuideS5Title")}</h2>
        {contact.avg_lead_time ? (
          <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{contact.avg_lead_time}</p>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">{t("orderGuideS5P1")}</p>
        )}
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
        {contact.company_address || contact.public_email || contact.public_phone || contact.public_whatsapp ? (
          <ul className="space-y-1 text-sm text-zinc-700 sm:text-base">
            <li>{contact.store_name}</li>
            {contact.company_address ? <li>{contact.company_address}</li> : null}
            {contact.public_email ? <li>{contact.public_email}</li> : null}
            {contact.public_phone ? <li>{contact.public_phone}</li> : null}
            {contact.public_whatsapp ? <li>WhatsApp {contact.public_whatsapp}</li> : null}
          </ul>
        ) : null}
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
    </SupportPageShell>
  );
}
