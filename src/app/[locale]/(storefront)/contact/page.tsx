import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSettings, getPublicSiteContact } from "@/lib/site-settings";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "supportPages" });
  return buildStorefrontMetadata({
    locale,
    path: "/contact",
    title: t("contactTitle"),
    description: t("contactBody"),
  });
}

function whatsAppHref(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : `https://wa.me/`;
}

export default async function ContactPage() {
  const [t, settings] = await Promise.all([getTranslations("supportPages"), getSiteSettings()]);
  const contact = getPublicSiteContact(settings);
  const hasDirectContact = Boolean(
    contact.public_email ||
      contact.public_phone ||
      contact.public_whatsapp ||
      contact.company_address ||
      contact.business_hours,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t("contactTitle")}</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>{t("contactBody")}</p>
        {hasDirectContact ? (
          <dl className="space-y-3">
            {contact.public_email ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("contactEmailLabel")}
                </dt>
                <dd>
                  <a href={`mailto:${contact.public_email}`} className="font-medium text-accent hover:underline">
                    {contact.public_email}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.public_phone ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("contactPhoneLabel")}
                </dt>
                <dd>
                  <a href={`tel:${contact.public_phone.replace(/\s/g, "")}`} className="font-medium text-accent hover:underline">
                    {contact.public_phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.public_whatsapp ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("contactWhatsappLabel")}
                </dt>
                <dd>
                  <a
                    href={whatsAppHref(contact.public_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent hover:underline"
                  >
                    {contact.public_whatsapp}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.company_address ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("contactAddressLabel")}
                </dt>
                <dd>{contact.company_address}</dd>
              </div>
            ) : null}
            {contact.business_hours ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("contactHoursLabel")}
                </dt>
                <dd>{contact.business_hours}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p>{t("contactUnavailable")}</p>
        )}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("wholesaleCta")}
        </Link>
      </div>
    </main>
  );
}
