import { getLocale, getTranslations } from "next-intl/server";
import { HomeTrendingSection } from "@/components/store/home-product-tabs";
import { HeroBannerSlider, type HeroBannerSlide } from "@/components/store/hero-banner-slider";
import { HomeTrustBar, HomeCategorySection, HomeFeaturedBrandsSection } from "@/components/store/header";
import { resolveHeroImageSrc } from "@/lib/admin/product-image-upload";
import { getUsdKrwRate } from "@/lib/currency";
import { buildProductsHref } from "@/lib/store/products-url";
import {
  DEFAULT_WHOLESALE_INQUIRY_HREF,
  mapHeroSlideCopyToBannerCopy,
  normalizeHeroHref,
} from "@/lib/store/storefront-href";
import { DEFAULT_SITE_SETTINGS, getHeroSlides, getSiteSettingsFresh } from "@/lib/site-settings";
import type { HeroSlide } from "@/types/database";
import {
  getPriorityBrandProducts,
  getStorefrontCategories,
  selectTrendingCategoryProducts,
} from "@/lib/supabase/products";
export const revalidate = 60;

/** Standard homepage hero brand set (VT, SKINFOOD, Torriden). */
const HERO_BRAND_ORDER = ["VT", "skinfood", "Torriden"] as const;

function resolveHeroSlideBrand(slideId: string, order: number): (typeof HERO_BRAND_ORDER)[number] {
  const id = slideId.toLowerCase();

  if (id.includes("bestseller") || id.includes("vt")) {
    return "VT";
  }

  if (id.includes("skinfood") || id.includes("mask-skinfood")) {
    return "skinfood";
  }

  if (id.includes("torriden") || id.includes("skincare-lineup")) {
    return "Torriden";
  }

  return HERO_BRAND_ORDER[order] ?? HERO_BRAND_ORDER[0];
}

async function loadSiteSettingsSafely() {
  try {
    return await getSiteSettingsFresh();
  } catch (error) {
    console.error("[home] getSiteSettingsFresh failed:", error);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

function buildDefaultHeroCopy(
  siteSettings: Awaited<ReturnType<typeof loadSiteSettingsSafely>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  return {
    badge: siteSettings.hero_badge,
    title: siteSettings.hero_title?.trim() || t("hero.title"),
    description: siteSettings.hero_subtitle?.trim() || t("hero.description"),
    shopBestSellersLabel:
      siteSettings.hero_button_text?.trim() || t("hero.shopBestSellers"),
    shopBestSellersHref: normalizeHeroHref(
      siteSettings.hero_button_link,
      buildProductsHref({ sort: "trending" }),
    ),
    wholesaleInquiryLabel: t("hero.wholesaleInquiry"),
    wholesaleInquiryHref: DEFAULT_WHOLESALE_INQUIRY_HREF,
  };
}

function resolveSlideBrandLabel(
  slide: HeroSlide,
  brand: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const fromTitle = slide.copy?.title?.trim();
  if (fromTitle) {
    return fromTitle;
  }

  const fromBadge = slide.copy?.badge?.trim();
  if (fromBadge) {
    return fromBadge;
  }

  return t("hero.shopBrand", { brand: brand === "skinfood" ? "SKINFOOD" : brand });
}

function mapStoredHeroSlideToBannerSlide(
  slide: HeroSlide,
  index: number,
  siteSettings: Awaited<ReturnType<typeof loadSiteSettingsSafely>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
): HeroBannerSlide | null {
  const src = resolveHeroImageSrc(slide.image_url, siteSettings.updated_at);
  if (!src) {
    return null;
  }

  const brand = resolveHeroSlideBrand(slide.id, index);
  const brandProductsHref = buildProductsHref({ brand });
  const slideCopyOverride = mapHeroSlideCopyToBannerCopy(slide.copy);

  const primaryHref = normalizeHeroHref(slide.copy?.button_link, brandProductsHref);

  const mobileSrcRaw = slide.mobile_image_url?.trim()
    ? resolveHeroImageSrc(slide.mobile_image_url, siteSettings.updated_at)
    : null;

  return {
    id: slide.id,
    src,
    ...(mobileSrcRaw ? { mobileSrc: mobileSrcRaw } : {}),
    href: primaryHref,
    brandLabel: resolveSlideBrandLabel(slide, brand, t),
    ...(slide.layout ? { layout: slide.layout } : {}),
    ...(slideCopyOverride ? { copy: slideCopyOverride } : {}),
  };
}
export default async function HomePage() {
  const [t, { products, meta }, locale, usdKrwRate, { categories }] = await Promise.all([
    getTranslations("home"),
    getPriorityBrandProducts({ limit: 200 }),
    getLocale(),
    getUsdKrwRate(),
    getStorefrontCategories(),
  ]);

  const siteSettings = await loadSiteSettingsSafely();
  const heroCopy = buildDefaultHeroCopy(siteSettings, t);

  const heroSlides = getHeroSlides(siteSettings)
    .map((slide, index) => mapStoredHeroSlideToBannerSlide(slide, index, siteSettings, t))
    .filter((slide): slide is HeroBannerSlide => slide !== null);

  const trendingProducts = {
    all: selectTrendingCategoryProducts(products, null, categories),
    skincare: selectTrendingCategoryProducts(products, "skincare", categories),
    makeup: selectTrendingCategoryProducts(products, "makeup", categories),
    haircare: selectTrendingCategoryProducts(products, "haircare", categories),
  } as const;

  return (
    <main>
      <HeroBannerSlider slides={heroSlides} copy={heroCopy} />

      <HomeTrustBar />

      {!meta.configured || meta.source === "static" ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("supabaseWarning")}
          </p>
        </div>
      ) : null}

      <HomeCategorySection products={products} />

      <section className="border-b border-zinc-200 bg-white py-10 sm:py-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <HomeTrendingSection
            title={t("trending.title")}
            viewAllLabel={t("trending.viewAll")}
            emptyMessage={t("trending.empty")}
            productsByFilter={trendingProducts}
            filterLabels={{
              all: t("trending.all"),
              skincare: t("trending.skincare"),
              makeup: t("trending.makeup"),
              haircare: t("trending.hairCare"),
            }}
            badgeLabels={{
              featured: t("trending.badgeFeatured"),
              bestSeller: t("trending.badgeBestSeller"),
              new: t("trending.badgeNew"),
              sale: t("trending.badgeSale"),
              soldOut: t("trending.soldOut"),
            }}
            locale={locale}
            usdKrwRate={usdKrwRate}
          />
        </div>
      </section>

      <HomeFeaturedBrandsSection products={products} />
    </main>
  );
}
