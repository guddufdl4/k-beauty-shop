import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HomeProductTabs } from "@/components/store/home-product-tabs";
import { getUsdKrwRate } from "@/lib/currency";
import { getSiteSettings } from "@/lib/site-settings";
import { getPriorityBrandProducts } from "@/lib/supabase/products";
import { buildProductsHref } from "@/lib/store/products-url";

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default async function HomePage() {
  const [t, { products }, locale, usdKrwRate, siteSettings] = await Promise.all([
    getTranslations("home"),
    getPriorityBrandProducts({ limit: 200 }),
    getLocale(),
    getUsdKrwRate(),
    getSiteSettings(),
  ]);

  const heroBadge = siteSettings.hero_badge ?? t("heroWholesale");
  const heroTitle = siteSettings.hero_title ?? t("heroDiscount");
  const heroSubtitle = siteSettings.hero_subtitle ?? t("description");
  const heroButtonText = siteSettings.hero_button_text ?? t("heroCta");
  const heroButtonLink = siteSettings.hero_button_link ?? "/products";
  const heroBackgroundStyle = siteSettings.hero_image_url
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(250,250,250,0.88) 0%, rgba(245,245,245,0.82) 45%, rgba(252,228,236,0.78) 100%), url(${siteSettings.hero_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const featuredProducts = products.filter((product) => product.is_featured);
  const bestSellers = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 8);
  const mostViewed = [...products].slice(0, 8);
  const newArrivals = [...products]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
  const allProducts = products.slice(0, 8);

  const uniqueBrands = [...new Set(products.map((product) => product.brand).filter(Boolean))].slice(0, 8);

  const sections = [
    {
      id: "popular",
      primaryTab: "bestSellers" as const,
      secondaryTab: "mostViewed" as const,
      products: {
        bestSellers,
        mostViewed,
        newArrivals,
        allProducts,
      },
      labels: {
        bestSellers: t("tabBestSellers"),
        mostViewed: t("tabMostViewed"),
        newArrivals: t("tabNewArrivals"),
        allProducts: t("tabAllProducts"),
      },
      viewAllLabel: t("viewAll"),
    },
    {
      id: "new",
      primaryTab: "newArrivals" as const,
      secondaryTab: "allProducts" as const,
      products: {
        bestSellers,
        mostViewed,
        newArrivals,
        allProducts,
      },
      labels: {
        bestSellers: t("tabBestSellers"),
        mostViewed: t("tabMostViewed"),
        newArrivals: t("tabNewArrivals"),
        allProducts: t("tabAllProducts"),
      },
      viewAllLabel: t("viewAll"),
    },
  ];

  return (
    <>
      <section
        className="overflow-hidden border-b border-zinc-200 bg-[linear-gradient(135deg,#fafafa_0%,#f5f5f5_45%,#fce4ec_100%)]"
        style={heroBackgroundStyle}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
          <div className="max-w-xl text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">{heroBadge}</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">{heroSubtitle}</p>
            {isExternalHref(heroButtonLink) ? (
              <a
                href={heroButtonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-11 items-center bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover sm:mt-8 sm:px-8"
              >
                {heroButtonText}
              </a>
            ) : (
              <Link
                href={heroButtonLink}
                className="mt-6 inline-flex min-h-11 items-center bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover sm:mt-8 sm:px-8"
              >
                {heroButtonText}
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {products.length > 0 ? (
          <HomeProductTabs
            sections={sections}
            emptyMessage={t("supabaseWarning")}
            badgeLabels={{ hot: t("badgeHot"), new: t("badgeNew") }}
            locale={locale}
            usdKrwRate={usdKrwRate}
          />
        ) : (
          <div className="border border-zinc-200 bg-white p-10 text-center">
            <p className="text-zinc-600">{t("supabaseWarning")}</p>
            <Link href="/products" className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline">
              {t("viewProducts")}
            </Link>
          </div>
        )}

        {uniqueBrands.length > 0 ? (
          <section className="mt-16 border-t border-zinc-200 pt-12">
            <h2 className="mb-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-zinc-800">
              {t("brandsTitle")}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {uniqueBrands.map((brand) => (
                <Link
                  key={brand}
                  href={buildProductsHref({ brand })}
                  className="flex h-16 items-center justify-center border border-zinc-200 bg-white px-3 text-center text-xs font-bold uppercase tracking-wide text-zinc-500 transition-colors hover:border-accent hover:text-accent"
                >
                  {brand}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16 border border-zinc-200 bg-surface-muted px-6 py-10 text-center sm:px-10">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">{t("b2bTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">{t("b2bDescription")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-zinc-600">
            <span>{t("b2cTitle")}: {t("b2cDescription")}</span>
            <span className="hidden sm:inline text-zinc-300">|</span>
            <span>{t("exportTitle")}: {t("exportDescription")}</span>
          </div>
        </section>
      </main>
    </>
  );
}
