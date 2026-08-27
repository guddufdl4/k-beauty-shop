"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { buildBrandHref } from "@/lib/store/brand-url";
import type { FeaturedNavBrand } from "@/lib/supabase/brand-hub";

type Props = {
  featuredBrands: FeaturedNavBrand[];
  moreBrands: FeaturedNavBrand[];
  isLoggedIn: boolean;
};

function BrandDirectoryLink({
  brand,
  onNavigate,
}: {
  brand: FeaturedNavBrand;
  onNavigate: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(brand.logoUrl) && !logoFailed;

  return (
    <Link
      href={buildBrandHref(brand.slug)}
      className="group flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-md border border-zinc-200 bg-white px-1.5 py-1.5 text-center transition-colors hover:border-accent hover:bg-accent-soft/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      onClick={onNavigate}
    >
      {showLogo ? (
        <Image
          src={brand.logoUrl!}
          alt=""
          aria-hidden
          width={80}
          height={28}
          sizes="80px"
          loading="lazy"
          className="h-5 max-h-5 w-auto max-w-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : null}
      <span className="line-clamp-2 w-full text-[10px] font-medium leading-tight text-zinc-700 transition-colors group-hover:text-accent">
        {brand.displayName}
      </span>
    </Link>
  );
}

function BrandDirectoryGrid({
  brands,
  onNavigate,
}: {
  brands: FeaturedNavBrand[];
  onNavigate: () => void;
}) {
  return (
    <ul className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
      {brands.map((brand) => (
        <li key={brand.slug} className="min-w-0">
          <BrandDirectoryLink brand={brand} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}

function BrandsMegaMenuPanel({
  featuredBrands,
  moreBrands,
  isLoggedIn,
  panelId,
  onNavigate,
}: {
  featuredBrands: FeaturedNavBrand[];
  moreBrands: FeaturedNavBrand[];
  isLoggedIn: boolean;
  panelId: string;
  onNavigate: () => void;
}) {
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home.featuredBrands");
  const hasBrands = featuredBrands.length > 0 || moreBrands.length > 0;

  return (
    <div
      id={panelId}
      className="border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      role="region"
      aria-label={tNav("brandsMenu")}
    >
      <div
        className={
          isLoggedIn
            ? "px-5 py-3 sm:px-6 sm:py-4"
            : "grid gap-3 px-5 py-3 sm:px-6 sm:py-4 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-5"
        }
      >
        <div className="min-w-0 space-y-3">
          {featuredBrands.length > 0 ? (
            <section aria-labelledby={`${panelId}-featured-heading`}>
              <h3
                id={`${panelId}-featured-heading`}
                className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                {tHome("title")}
              </h3>
              <BrandDirectoryGrid brands={featuredBrands} onNavigate={onNavigate} />
            </section>
          ) : null}

          {moreBrands.length > 0 ? (
            <section aria-labelledby={`${panelId}-more-heading`}>
              <h3
                id={`${panelId}-more-heading`}
                className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500"
              >
                {tNav("moreBrands")}
              </h3>
              <BrandDirectoryGrid brands={moreBrands} onNavigate={onNavigate} />
            </section>
          ) : null}

          {!hasBrands ? (
            <p className="text-sm text-zinc-600">{tNav("brandsMenuEmpty")}</p>
          ) : null}

          <Link
            href="/brands"
            className="inline-flex text-xs font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={onNavigate}
          >
            {tNav("browseAllBrandsAZ")}
          </Link>
        </div>

        {!isLoggedIn ? (
          <aside className="flex shrink-0 flex-col justify-center rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 lg:min-w-[11rem] lg:max-w-[12rem]">
            <p className="text-xs font-medium leading-snug text-zinc-800">
              {tNav("signInWholesalePrices")}
            </p>
            <Link
              href="/login"
              className="mt-2.5 inline-flex w-fit items-center justify-center rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              onClick={onNavigate}
            >
              {tNav("login")}
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function BrandsMegaMenuInner({ featuredBrands, moreBrands, isLoggedIn }: Props) {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const isBrandsActive =
    pathname === "/brands" ||
    (pathname.startsWith("/brands/") && pathname.length > "/brands/".length);

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu]);

  return (
    <div ref={rootRef} className="flex self-stretch">
      <button
        ref={triggerRef}
        type="button"
        className={`flex items-center border-r border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          open || isBrandsActive ? "text-accent" : "text-zinc-800"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {tNav("brands")}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[55] bg-black/5"
          aria-hidden="true"
          onClick={closeMenu}
        />
      ) : null}

      <div
        className={`absolute inset-x-0 top-full z-[60] transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <BrandsMegaMenuPanel
            featuredBrands={featuredBrands}
            moreBrands={moreBrands}
            isLoggedIn={isLoggedIn}
            panelId={panelId}
            onNavigate={closeMenu}
          />
        </div>
      </div>
    </div>
  );
}

export function BrandsMegaMenu(props: Props) {
  const pathname = usePathname();
  return <BrandsMegaMenuInner key={pathname} {...props} />;
}
