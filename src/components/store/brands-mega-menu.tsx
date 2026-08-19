"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { buildBrandHref } from "@/lib/store/brand-url";
import type { FeaturedNavBrand } from "@/lib/supabase/brand-hub";

type Props = {
  brands: FeaturedNavBrand[];
  isLoggedIn: boolean;
};

function BrandsMegaMenuPanel({
  brands,
  isLoggedIn,
  panelId,
  onNavigate,
}: {
  brands: FeaturedNavBrand[];
  isLoggedIn: boolean;
  panelId: string;
  onNavigate: () => void;
}) {
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home.featuredBrands");

  return (
    <div
      id={panelId}
      className="border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      role="region"
      aria-label={tNav("brandsMenu")}
    >
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_auto] lg:gap-10 lg:px-8 lg:py-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            {tHome("title")}
          </p>
          {brands.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
              {brands.map((brand) => (
                <li key={brand.slug}>
                  <Link
                    href={buildBrandHref(brand.slug)}
                    className="group flex min-h-[4.5rem] flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-4 text-center transition-colors hover:border-accent hover:bg-accent-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    onClick={onNavigate}
                  >
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt=""
                        width={120}
                        height={40}
                        sizes="120px"
                        loading="lazy"
                        className="h-8 w-auto max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold uppercase leading-tight tracking-wide text-zinc-700 transition-colors group-hover:text-accent">
                        {brand.displayName}
                      </span>
                    )}
                    <span className="sr-only">{brand.displayName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">{tNav("brandsMenuEmpty")}</p>
          )}
          <Link
            href="/brands"
            className="mt-5 inline-flex text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={onNavigate}
          >
            {tHome("viewAll")}
          </Link>
        </div>

        {!isLoggedIn ? (
          <aside className="flex min-w-[14rem] flex-col justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-5 py-5 lg:min-w-[16rem]">
            <p className="text-sm font-medium text-zinc-800">{tNav("signInWholesalePrices")}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex w-fit items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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

function BrandsMegaMenuInner({ brands, isLoggedIn }: Props) {
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const isBrandsActive =
    pathname === "/brands" || (pathname.startsWith("/brands/") && pathname.length > "/brands/".length);

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
    <div ref={rootRef} className="relative flex self-stretch">
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
        className={`absolute left-0 top-full z-[60] w-[min(100vw-2rem,72rem)] transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <BrandsMegaMenuPanel
          brands={brands}
          isLoggedIn={isLoggedIn}
          panelId={panelId}
          onNavigate={closeMenu}
        />
      </div>
    </div>
  );
}

export function BrandsMegaMenu(props: Props) {
  const pathname = usePathname();
  return <BrandsMegaMenuInner key={pathname} {...props} />;
}
