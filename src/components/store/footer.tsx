import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicSiteContact } from "@/lib/site-settings";
import { ViewModeToggle } from "./view-mode";

type Props = PublicSiteContact;

function isValidExternalUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function whatsAppHref(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : `https://wa.me/`;
}

export async function StoreFooter({
  store_name,
  public_email,
  public_phone,
  public_whatsapp,
  company_address,
  business_hours,
  avg_lead_time,
  company_registration,
  instagram_url,
  facebook_url,
}: Props) {
  const t = await getTranslations("footer");
  const brand = store_name?.trim() || "HMT KOREA";
  const acronym = brand.replace(/\s+/g, "").toUpperCase();
  const showViewModeToggle = process.env.NODE_ENV === "development";
  const showInstagram = isValidExternalUrl(instagram_url);
  const showFacebook = isValidExternalUrl(facebook_url);
  const showWhatsApp = Boolean(public_whatsapp?.trim());

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-4">
        <div>
          <div className="mb-4 inline-flex flex-col gap-1">
            <span className="text-lg font-semibold tracking-[0.2em] sm:text-xl">
              <span className="text-accent">{acronym.charAt(0)}</span>
              <span className="text-zinc-900">{acronym.slice(1)}</span>
            </span>
            <span className="h-px w-10 bg-gradient-to-r from-accent via-accent/50 to-transparent" aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-zinc-500">{t("description")}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t("moqSummary")}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t("paymentSummary")}</p>
          {company_address ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{company_address}</p>
          ) : null}
          {public_email ? (
            <a href={`mailto:${public_email}`} className="mt-2 block text-sm text-accent hover:underline">
              {public_email}
            </a>
          ) : null}
          {public_phone ? (
            <a href={`tel:${public_phone.replace(/\s/g, "")}`} className="mt-1 block text-sm text-zinc-600 hover:text-accent">
              {t("phoneLabel")}: {public_phone}
            </a>
          ) : null}
          {showWhatsApp ? (
            <a
              href={whatsAppHref(public_whatsapp!)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-zinc-600 hover:text-accent"
            >
              {t("whatsappLabel")}: {public_whatsapp}
            </a>
          ) : null}
          {business_hours ? (
            <p className="mt-2 text-sm text-zinc-500">
              {t("hoursLabel")}: {business_hours}
            </p>
          ) : null}
          {avg_lead_time ? (
            <p className="mt-1 text-sm text-zinc-500">
              {t("leadTimeLabel")}: {avg_lead_time}
            </p>
          ) : null}
          {company_registration ? (
            <p className="mt-1 text-sm text-zinc-500">
              {t("registrationLabel")}: {company_registration}
            </p>
          ) : null}
          {showInstagram || showFacebook ? (
            <div className="mt-4 flex gap-3 text-zinc-400">
              {showInstagram ? (
                <a
                  href={instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent"
                  aria-label="Instagram"
                >
                  IG
                </a>
              ) : null}
              {showFacebook ? (
                <a
                  href={facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent"
                  aria-label="Facebook"
                >
                  FB
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-900">{t("infoTitle")}</h3>
          <ul className="space-y-1 text-sm text-zinc-500 sm:space-y-2">
            <li>
              <Link href="/shipping" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("shipping")}
              </Link>
            </li>
            <li>
              <Link href="/payment" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("payment")}
              </Link>
            </li>
            <li>
              <Link href="/returns" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("returns")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("faq")}
              </Link>
            </li>
            <li>
              <Link href="/wholesale-inquiry" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("wholesale")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-900">{t("supportTitle")}</h3>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li>
              <Link href="/categories" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("categories")}
              </Link>
            </li>
            <li>
              <Link href="/products" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("catalog")}
              </Link>
            </li>
            <li>
              <Link href="/cart" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("orderGuide")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-900">{t("aboutTitle")}</h3>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li>
              <Link href="/about" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("about")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/signup" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("membership")}
              </Link>
            </li>
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("sitemap")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-100 bg-surface-muted px-4 py-5 text-center text-xs text-zinc-500">
        {showViewModeToggle ? <ViewModeToggle /> : null}
        <p className={showViewModeToggle ? "mt-4" : undefined}>{t("copyright", { brand })}</p>
      </div>
    </footer>
  );
}
