import { SupportPageShell } from "@/components/store/support-page-shell";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { getPublicSiteContact, getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildStorefrontMetadata({
    locale,
    path: "/terms",
    title: t("termsTitle"),
    description: t("termsIntro"),
  });
}

export default async function TermsPage() {
  const [t, settings] = await Promise.all([
    getTranslations("legal"),
    getSiteSettings(),
  ]);
  const contact = getPublicSiteContact(settings);

  return (
    <SupportPageShell activeHref="/terms" title={t("termsTitle")}>
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">{t("termsEyebrow")}</p>

      <p className="mt-3 text-sm text-zinc-500">{t("termsEffective")}</p>

      <div className="prose prose-zinc mt-10 max-w-none text-sm leading-relaxed text-zinc-700">
        <p>{t("termsIntro")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("termsScopeTitle")}</h2>
        <p>{t("termsScopeBody")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("termsServicesTitle")}</h2>
        <p>{t("termsServicesBody")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("termsAccountsTitle")}</h2>
        <p>{t("termsAccountsBody")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("termsOrdersTitle")}</h2>
        <p>{t("termsOrdersBody")}</p>
        {contact.public_email || contact.public_phone || contact.public_whatsapp || contact.company_address ? (
          <>
            <h2 className="mt-8 text-base font-semibold text-zinc-900">{contact.store_name}</h2>
            <p>
              {[contact.company_address, contact.public_email, contact.public_phone, contact.public_whatsapp]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </>
        ) : null}
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/privacy" className="text-sm font-semibold text-rose-600 hover:underline">
          {t("privacyTitle")}
        </Link>
        <Link href="/about" className="text-sm font-semibold text-rose-600 hover:underline">
          About
        </Link>
        <Link href="/" className="text-sm font-semibold text-zinc-600 hover:underline">
          Home
        </Link>
      </div>
    </SupportPageShell>
  );
}
