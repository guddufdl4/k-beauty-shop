import { getLocale, getTranslations } from "next-intl/server";

import Image from "next/image";

import { Link } from "@/i18n/navigation";

import { getCart } from "@/lib/cart";

import { getStorefrontCategories } from "@/lib/supabase/products";
import { localizeCategories, pickStorefrontNavCategories } from "@/lib/store/localized-category";

import { getSessionProfile } from "@/lib/supabase/auth-helpers";

import { LocaleSwitcher } from "./locale-switcher";

import { MobileNavActions, MobileNavPanels, MobileNavRoot } from "./mobile-nav";

import { StoreSearchBar } from "./store-search-bar";
import { CategoryMegaMenu } from "./category-mega-menu";
import { CategoryIcon } from "@/lib/store/category-icons";
import { resolveHomeCategoryImageUrls } from "@/lib/product-images";
import { resolveFeaturedBrands, type FeaturedBrand } from "@/lib/store/partner-brands";
import {
  buildProductsHref,
  HOME_CATEGORY_SLUGS,
  HOME_TRUST_HIGHLIGHTS,
  MAIN_NAV_LINKS,
  type HomeTrustHighlightKey,
} from "@/lib/store/products-url";
import type { Category, ProductWithRelations } from "@/lib/supabase/products";



type Props = {

  storeName?: string;

};



function StoreBrandLogo({ brandLabel }: { brandLabel: string }) {
  const raw = brandLabel.trim() || "HMT";
  const acronym = raw.replace(/\s+/g, "").toUpperCase();
  const isAcronym = acronym.length <= 5 && !raw.includes(" ");

  const wordmarkClass =
    "block font-black italic leading-none tracking-[-0.03em] text-[1.75rem] sm:text-3xl lg:text-[2.125rem]";

  if (isAcronym) {
    return (
      <span className="inline-flex min-w-[3.25rem] flex-col gap-1.5 sm:min-w-[4rem]">
        <span className={wordmarkClass}>
          <span className="text-accent">{acronym.charAt(0)}</span>
          <span className="text-zinc-900">{acronym.slice(1)}</span>
        </span>
        <span
          className="h-[2px] w-full max-w-[2.75rem] bg-gradient-to-r from-accent/70 via-accent/25 to-transparent sm:max-w-[3.25rem]"
          aria-hidden
        />
      </span>
    );
  }

  const parts = raw.split(/\s+/);

  return (
    <span className="inline-flex min-w-0 max-w-[min(100%,14rem)] flex-col gap-1.5 sm:max-w-none">
      <span className={`${wordmarkClass} truncate not-italic sm:not-italic`}>
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {index > 0 ? " " : null}
            <span className={index === 0 ? "text-accent" : "text-zinc-900"}>{part.toUpperCase()}</span>
          </span>
        ))}
      </span>
      <span
        className="h-[2px] w-full max-w-[3rem] bg-gradient-to-r from-accent/70 via-accent/25 to-transparent"
        aria-hidden
      />
    </span>
  );
}



function IconLink({

  href,

  label,

  children,

}: {

  href: string;

  label: string;

  children: React.ReactNode;

}) {

  return (

    <Link
      href={href}
      aria-label={label}
      className="group flex flex-col items-center gap-1 text-zinc-600 hover:text-accent-hover"
    >

      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft">

        {children}

      </span>

      <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{label}</span>

    </Link>

  );

}



export async function StoreHeader({ storeName }: Props) {

  const [cart, { user, profile }, tNav, locale, { categories }] = await Promise.all([

    getCart(),

    getSessionProfile(),

    getTranslations("nav"),

    getLocale(),

    getStorefrontCategories(),

  ]);



  const brandLabel = storeName?.trim() || tNav("brand");
  const localizedCategories = localizeCategories(categories, locale);

  const accountHref = user ? "/account" : "/login";

  const accountIconLabel = tNav("headerAccount");



  return (

    <header className="sticky top-0 z-50 overflow-visible border-b border-zinc-200 bg-white shadow-sm">

      <div className="border-b border-zinc-100 bg-surface-muted">

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-zinc-600 sm:px-6">

          <p className="hidden min-w-0 items-center gap-2 truncate sm:flex">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
            </svg>
            <span className="truncate">{tNav("utilityTagline")}</span>
          </p>

          <LocaleSwitcher className="ml-auto inline-flex items-center" />

        </div>

      </div>



      <MobileNavRoot
        cartCount={cart.itemCount}
        isLoggedIn={Boolean(user)}
        profileRole={profile?.role ?? null}
        profileFullName={profile?.full_name ?? null}
        categories={localizedCategories}
        labels={{
          categories: tNav("categories"),
          products: tNav("products"),
          cart: tNav("cart"),
          login: tNav("login"),
          signup: tNav("signup"),
          logout: tNav("logout"),
          account: tNav("account"),
          admin: tNav("admin"),
          menu: tNav("menu"),
          shop: tNav("shop"),
          brands: tNav("brands"),
          shopSale: tNav("shopSale"),
          shopTrending: tNav("shopTrending"),
          shopLatest: tNav("shopLatest"),
          about: tNav("about"),
          searchPlaceholder: tNav("searchPlaceholder"),
          searchButton: tNav("searchButton"),
        }}
      >
        <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 py-3.5 sm:gap-5 sm:py-4 lg:gap-10 lg:py-5">

          <Link
            href="/"
            locale={locale}
            className="group shrink-0 py-1 pr-2 transition-opacity hover:opacity-85 sm:pr-4 lg:pr-6"
            aria-label={brandLabel}
          >
            <StoreBrandLogo brandLabel={brandLabel} />
          </Link>



          <div className="hidden flex-1 lg:block">

            <StoreSearchBar className="mx-auto max-w-2xl" />

          </div>



          <div className="ml-auto flex items-center gap-2 sm:gap-4">

            <div className="hidden items-center gap-3 md:flex">

              <IconLink href={accountHref} label={accountIconLabel}>

                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">

                  <circle cx="12" cy="8" r="4" />

                  <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" strokeLinecap="round" />

                </svg>

              </IconLink>

              <Link
                href="/cart"
                aria-label={tNav("cart")}
                className="group relative flex flex-col items-center gap-1 text-zinc-600 hover:text-accent-hover"
              >
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M6 6L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {cart.itemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {cart.itemCount}
                    </span>
                  ) : null}
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{tNav("cart")}</span>
              </Link>

            </div>

            <MobileNavActions />

          </div>

        </div>

        <MobileNavPanels />

        <StoreMainNav categories={localizedCategories} />

        </div>
      </MobileNavRoot>

    </header>

  );

}

export async function StoreMainNav({ categories }: { categories: Category[] }) {
  const tNav = await getTranslations("nav");
  const standardLinks = MAIN_NAV_LINKS.filter((item) => !item.highlight);
  const wholesaleLink = MAIN_NAV_LINKS.find((item) => item.highlight);

  return (
    <nav
      className="relative hidden items-stretch overflow-visible border-t border-zinc-100 lg:flex"
      aria-label={tNav("mainNavigation")}
    >
      <div className="mx-auto flex w-full max-w-7xl items-stretch px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryMegaMenu categories={categories} />
          {standardLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex shrink-0 items-center px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-800 transition-colors hover:text-accent"
            >
              {tNav(item.key as "skincare")}
            </Link>
          ))}
          {wholesaleLink ? (
            <Link
              href={wholesaleLink.href}
              className="ml-auto flex shrink-0 items-center px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-accent transition-colors hover:text-accent-hover"
            >
              {tNav("wholesale")}
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function TrustIcon({ name }: { name: HomeTrustHighlightKey }) {
  const className = "h-6 w-6 shrink-0 text-accent";

  switch (name) {
    case "authenticProducts":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 3l7 3v6c0 4.5-3.2 7.8-7 9-3.8-1.2-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flexibleMoq":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" strokeLinejoin="round" />
          <path d="M12 4v16M4 8l8 4 8-4" strokeLinejoin="round" />
        </svg>
      );
    case "globalShipping":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
        </svg>
      );
    case "b2bSupport":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 14v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" />
          <path d="M8 14a4 4 0 018 0v3H8v-3z" strokeLinejoin="round" />
          <path d="M12 6a2 2 0 012 2v2h-4V8a2 2 0 012-2z" strokeLinejoin="round" />
        </svg>
      );
  }
}

export async function HomeTrustBar() {
  const t = await getTranslations("home.trust");
  const items = HOME_TRUST_HIGHLIGHTS.filter((item) => item.enabled);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-zinc-200 bg-white" aria-label={t("sectionLabel")}>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:gap-x-8 lg:py-10">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <TrustIcon name={item.key} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">{t(`${item.key}.title`)}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">{t(`${item.key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const HOME_CATEGORY_I18N_KEY: Record<string, string> = {
  skincare: "skincare",
  makeup: "makeup",
  "mask-pack": "maskPack",
  suncare: "suncare",
  haircare: "hairCare",
  bodycare: "bodyCare",
};

type HomeCategorySectionProps = {
  products: ProductWithRelations[];
};

export async function HomeCategorySection({ products }: HomeCategorySectionProps) {
  const enabledSlugs = HOME_CATEGORY_SLUGS.filter((item) => item.enabled).map((item) => item.slug);

  if (enabledSlugs.length === 0) {
    return null;
  }

  const [t, locale, { categories }] = await Promise.all([
    getTranslations("home.categorySection"),
    getLocale(),
    getStorefrontCategories(),
  ]);

  const navCategories = pickStorefrontNavCategories(categories);
  const categoryBySlug = new Map(
    localizeCategories(
      navCategories.filter((category) => enabledSlugs.includes(category.slug as (typeof enabledSlugs)[number])),
      locale,
    ).map((category) => [category.slug, category]),
  );

  const categoryImages = resolveHomeCategoryImageUrls(products, categories, enabledSlugs);

  const items = enabledSlugs.map((slug) => {
    const category = categoryBySlug.get(slug);
    const i18nKey = HOME_CATEGORY_I18N_KEY[slug];
    const label = i18nKey ? t(i18nKey) : (category?.name ?? slug);

    return {
      slug,
      label,
      href: buildProductsHref({ category: slug }),
      imageUrl: categoryImages[slug] ?? null,
    };
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-zinc-200 bg-white py-10 sm:py-12" aria-labelledby="home-category-heading">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <h2 id="home-category-heading" className="text-xl font-bold text-zinc-900 sm:text-2xl">
            {t("title")}
          </h2>
          <Link
            href="/categories"
            className="shrink-0 text-sm font-semibold text-accent-hover transition-colors hover:text-accent"
          >
            {t("viewAll")}
          </Link>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-6">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-colors group-hover:border-accent">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <CategoryIcon slug={item.slug} className="h-12 w-12" />
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-zinc-900 transition-colors group-hover:text-accent">
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

type HomeFeaturedBrandsSectionProps = {
  products: ProductWithRelations[];
};

function FeaturedBrandCard({ brand }: { brand: FeaturedBrand }) {
  return (
    <Link
      href={buildProductsHref({ brand: brand.filterBrand })}
      className="group flex min-h-[88px] min-w-[140px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-6 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:min-h-[96px] lg:min-w-0"
    >
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt={brand.displayName}
          width={140}
          height={48}
          sizes="140px"
          loading="lazy"
          className="h-10 w-auto max-w-full object-contain"
        />
      ) : (
        <span className="text-center text-xs font-bold uppercase leading-tight tracking-wide text-zinc-800 sm:text-sm">
          {brand.displayName}
        </span>
      )}
    </Link>
  );
}

export async function HomeFeaturedBrandsSection({ products }: HomeFeaturedBrandsSectionProps) {
  const [t, brands] = await Promise.all([
    getTranslations("home.featuredBrands"),
    resolveFeaturedBrands(products),
  ]);

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-zinc-200 bg-white py-10 sm:py-12" aria-labelledby="home-featured-brands-heading">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <h2 id="home-featured-brands-heading" className="text-xl font-bold text-zinc-900 sm:text-2xl">
            {t("title")}
          </h2>
          <Link
            href="/brands"
            className="shrink-0 text-sm font-semibold text-accent-hover transition-colors hover:text-accent"
          >
            {t("viewAll")}
          </Link>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 lg:snap-none">
          {brands.map((brand) => (
            <FeaturedBrandCard key={brand.displayName} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

