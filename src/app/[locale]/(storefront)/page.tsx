import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HomeProductTabs } from "@/components/store/home-product-tabs";
import { HeroBannerSlider } from "@/components/store/hero-banner-slider";
import { resolveHeroImageSrc } from "@/lib/admin/product-image-upload";
import { getUsdKrwRate } from "@/lib/currency";
import { productHasRealImage } from "@/lib/product-images";
import { DEFAULT_SITE_SETTINGS, getHeroSlides, getSiteSettingsFresh } from "@/lib/site-settings";
import { getPriorityBrandProducts, type ProductWithRelations } from "@/lib/supabase/products";
import { buildProductsHref } from "@/lib/store/products-url";

export const revalidate = 60;

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function sortHomeProducts(products: ProductWithRelations[]): ProductWithRelations[] {
  return [...products].sort((a, b) => {
    const aHasImage = productHasRealImage(a) ? 1 : 0;
    const bHasImage = productHasRealImage(b) ? 1 : 0;
    if (bHasImage !== aHasImage) {
      return bHasImage - aHasImage;
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

async function loadSiteSettingsSafely() {
  try {
    return await getSiteSettingsFresh();
  } catch (error) {
    console.error("[home] getSiteSettingsFresh failed:", error);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

function HeroTextFallback({
  heroBadge,
  heroTitle,
  heroSubtitle,
  heroButtonText,
  heroButtonLink,
}: {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroButtonLink: string;
}) {
  return (
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
  );
}

export default async function HomePage() {
  const [t, { products, meta }, locale, usdKrwRate] = await Promise.all([
    getTranslations("home"),
    getPriorityBrandProducts({ limit: 200 }),
    getLocale(),
    getUsdKrwRate(),
  ]);

  const siteSettings = await loadSiteSettingsSafely();

  const heroBadge = siteSettings.hero_badge ?? t("heroWholesale");
  const heroTitle = siteSettings.hero_title ?? t("heroDiscount");
  const heroSubtitle = siteSettings.hero_subtitle ?? t("description");
  const heroButtonText = siteSettings.hero_button_text ?? t("heroCta");
  const heroButtonLink = siteSettings.hero_button_link ?? "/products";
  const heroSlides = getHeroSlides(siteSettings)
    .map((slide) => {
      const src = resolveHeroImageSrc(slide.image_url, siteSettings.updated_at);
      return src ? { id: slide.id, src } : null;
    })
    .filter((slide): slide is { id: string; src: string } => slide !== null);
  const hasHeroSlides = heroSlides.length > 0;

  const visibleProducts = products.filter((product) => productHasRealImage(product));

  const featuredProducts = visibleProducts.filter((product) => product.is_featured);
  const bestSellers = sortHomeProducts(
    featuredProducts.length > 0 ? featuredProducts : visibleProducts,
  ).slice(0, 8);
  const mostViewed = sortHomeProducts(visibleProducts).slice(0, 8);
  const tabEmptyMessage = t("tabEmpty");
  const newArrivals = sortHomeProducts(visibleProducts).slice(0, 8);
  const allProducts = sortHomeProducts(visibleProducts).slice(0, 8);

  const uniqueBrands = [...new Set(visibleProducts.map((product) => product.brand).filter(Boolean))].slice(0, 8);

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
      {hasHeroSlides ? (
        <HeroBannerSlider slides={heroSlides} />
      ) : (
        <section className="overflow-hidden border-b border-zinc-200 bg-[linear-gradient(135deg,#f1f5f9_0%,#e2e8f0_45%,#fce4ec_100%)]">
          <HeroTextFallback
            heroBadge={heroBadge}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroButtonText={heroButtonText}
            heroButtonLink={heroButtonLink}
          />
        </section>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {!meta.configured || meta.source === "static" ? (
          <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("supabaseWarning")}
          </p>
        ) : null}

        <HomeProductTabs
          sections={sections}
          emptyMessage={tabEmptyMessage}
          badgeLabels={{ hot: t("badgeHot"), new: t("badgeNew") }}
          locale={locale}
          usdKrwRate={usdKrwRate}
        />

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
      </div>
    </>
  );
}
