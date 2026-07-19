import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildProductsHref } from "@/lib/store/products-url";
import { getRelatedSearchTerms } from "@/lib/supabase/product-search";

type Props = {
  query: string;
};

export async function RelatedSearchTerms({ query }: Props) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return null;
  }

  const [t, { terms }] = await Promise.all([
    getTranslations("products"),
    getRelatedSearchTerms(trimmed),
  ]);

  if (terms.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-4 sm:px-5"
      aria-label={t("relatedSearchTitle")}
    >
      <h2 className="text-sm font-semibold text-zinc-900">{t("relatedSearchTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("relatedSearchDescription")}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {terms.map((term) => (
          <li key={term}>
            <Link
              href={buildProductsHref({ q: term })}
              className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
