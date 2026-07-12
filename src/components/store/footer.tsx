import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ViewModeToggle } from "./view-mode";

type Props = {
  contactEmail?: string | null;
  storeName?: string;
};

export async function StoreFooter({ contactEmail, storeName }: Props) {
  const t = await getTranslations("footer");
  const brand = storeName?.trim() || "K-Beauty Shop";

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
              K
            </span>
            <span className="text-base font-bold text-zinc-900">{brand}</span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-500">{t("address")}</p>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} className="mt-2 block text-sm text-accent hover:underline">
              {contactEmail}
            </a>
          ) : null}
          <div className="mt-4 flex gap-3 text-zinc-400">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent" aria-label="Instagram">
              IG
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent" aria-label="Facebook">
              FB
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-zinc-900">{t("infoTitle")}</h3>
          <ul className="space-y-1 text-sm text-zinc-500 sm:space-y-2">
            <li>
              <Link href="/products" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("shipping")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("payment")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("returns")}
              </Link>
            </li>
            <li>
              <Link href="/about" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
                {t("faq")}
              </Link>
            </li>
            <li>
              <Link href="/products" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
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
              <Link href="/about" className="inline-flex min-h-11 items-center hover:text-accent hover:underline">
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
        <ViewModeToggle />
        <p className="mt-4">{t("copyright")}</p>
      </div>
    </footer>
  );
}
