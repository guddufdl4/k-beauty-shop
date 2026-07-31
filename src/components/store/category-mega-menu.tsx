"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CategoryIcon, DownArrowIcon } from "@/lib/store/category-icons";
import { buildCategoryTree, sortCategoriesForNav } from "@/lib/store/category-tree";
import {
  getEnglishCategoryName,
  getLocalizedCategoryName,
} from "@/lib/store/localized-category";
import { isStorefrontNavSlug, type StorefrontNavSlug } from "@/lib/store/category-taxonomy";
import { buildProductsHref } from "@/lib/store/products-url";
import type { Category } from "@/lib/supabase/products";

function ChevronRightIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type StripPanelProps = {
  categories: Category[];
  promoImageUrl?: string | null;
  onNavigate?: () => void;
};

function CategorySubcategoryPanel({
  parent,
  childrenByParentId,
  locale,
  onNavigate,
}: {
  parent: Category;
  childrenByParentId: Map<string, Category[]>;
  locale: string;
  onNavigate?: () => void;
}) {
  const tProducts = useTranslations("products");
  const parentSlug = parent.slug as StorefrontNavSlug;
  const subcategories = useMemo(() => {
    const children = childrenByParentId.get(parent.id) ?? [];
    if (!isStorefrontNavSlug(parent.slug)) {
      return children;
    }
    return sortCategoriesForNav(parentSlug, children, locale);
  }, [childrenByParentId, locale, parent.id, parent.slug, parentSlug]);

  const localizedParent = getLocalizedCategoryName(parent, locale);

  if (subcategories.length === 0) {
    return (
      <div className="flex min-h-[14rem] flex-col justify-center px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {localizedParent}
        </p>
        <Link
          href={buildProductsHref({ category: parent.slug })}
          className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          onClick={onNavigate}
        >
          {tProducts("allInCategory", { category: localizedParent })}
          <ChevronRightIcon />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[14rem] flex-col px-5 py-5 sm:px-6 sm:py-6">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          {localizedParent}
        </p>
        <Link
          href={buildProductsHref({ category: parent.slug })}
          className="text-[11px] font-semibold uppercase tracking-wide text-accent hover:text-accent-hover"
          onClick={onNavigate}
        >
          {tProducts("allInCategory", { category: localizedParent })}
        </Link>
      </div>
      <ul className="space-y-0.5 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {subcategories.map((subcategory) => {
          const nested = childrenByParentId.get(subcategory.id) ?? [];
          const subLabel = getLocalizedCategoryName(subcategory, locale);

          return (
            <li key={subcategory.id}>
              <Link
                href={buildProductsHref({ category: subcategory.slug })}
                className="group flex items-center justify-between gap-3 rounded-sm px-2 py-2.5 text-sm text-zinc-800 transition-colors hover:bg-accent-soft/35 hover:text-accent"
                onClick={onNavigate}
              >
                <span className="truncate">{subLabel}</span>
                {nested.length > 0 ? (
                  <ChevronRightIcon className="shrink-0 text-zinc-400 transition-colors group-hover:text-accent" />
                ) : null}
              </Link>
              {nested.length > 0 ? (
                <ul className="mb-1 ml-3 border-l border-zinc-100 pl-3">
                  {nested.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={buildProductsHref({ category: child.slug })}
                        className="block rounded-sm px-2 py-2 text-[13px] text-zinc-600 transition-colors hover:bg-accent-soft/25 hover:text-accent"
                        onClick={onNavigate}
                      >
                        {getLocalizedCategoryName(child, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CategoryNavStripPanel({ categories, promoImageUrl, onNavigate }: StripPanelProps) {
  const locale = useLocale();
  const tHome = useTranslations("home");
  const { navCategories, childrenByParentId } = useMemo(
    () => buildCategoryTree(categories, locale),
    [categories, locale],
  );
  const [activeParentId, setActiveParentId] = useState<string | null>(
    navCategories[0]?.id ?? null,
  );

  const activeParent =
    navCategories.find((category) => category.id === activeParentId) ?? navCategories[0] ?? null;

  if (navCategories.length === 0) {
    return null;
  }

  return (
    <div className="flex overflow-hidden bg-white">
      <div className="flex min-w-0 flex-col border-r border-zinc-200 sm:flex-row sm:flex-1">
        <div className="flex min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:w-[min(100%,28rem)] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {navCategories.map((category, index) => {
            const englishName = getEnglishCategoryName(category);
            const localizedName = getLocalizedCategoryName(category, locale);
            const subtitle = tHome("categoryNavSubtitle", { category: localizedName });
            const isActive = activeParent?.id === category.id;
            const hasChildren = (childrenByParentId.get(category.id) ?? []).length > 0;

            return (
              <div
                key={category.id}
                className={`min-w-[7.5rem] flex-1 sm:min-w-0 sm:flex-none ${
                  index < navCategories.length - 1 ? "border-b border-zinc-100 sm:border-b-0 sm:border-r" : ""
                }`}
                onMouseEnter={() => setActiveParentId(category.id)}
                onFocus={() => setActiveParentId(category.id)}
              >
                <Link
                  href={buildProductsHref({ category: category.slug })}
                  className={`group flex h-full flex-col items-center px-3 py-5 text-center transition-colors sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-4 sm:text-left ${
                    isActive ? "bg-accent-soft/30" : "hover:bg-accent-soft/20"
                  }`}
                  onClick={onNavigate}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                    <CategoryIcon slug={category.slug} className="h-7 w-7 sm:h-6 sm:w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-wide text-zinc-900 sm:text-[11px]">
                      {englishName}
                    </span>
                    <span className="mt-1 block text-[10px] text-zinc-500 sm:text-[11px]">{subtitle}</span>
                  </span>
                  {hasChildren ? (
                    <span className="mt-2 hidden text-accent sm:mt-0 sm:block">
                      <ChevronRightIcon className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="mt-2 text-accent transition-transform group-hover:translate-y-0.5 sm:hidden">
                      <DownArrowIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="hidden min-w-[15rem] flex-1 bg-white sm:block lg:min-w-[18rem]">
          {activeParent ? (
            <CategorySubcategoryPanel
              parent={activeParent}
              childrenByParentId={childrenByParentId}
              locale={locale}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>
      </div>

      <Link
        href={buildProductsHref({ sort: "sale" })}
        className="relative hidden w-[11.5rem] shrink-0 flex-col justify-end overflow-hidden border-l border-zinc-200 bg-zinc-900 p-4 text-white transition-opacity hover:opacity-95 sm:w-[13rem] lg:flex xl:w-[15rem]"
        onClick={onNavigate}
      >
        {promoImageUrl ? (
          <Image
            src={promoImageUrl}
            alt=""
            fill
            className="object-cover opacity-60"
            sizes="240px"
          />
        ) : (
          <span
            className="absolute inset-0 bg-[linear-gradient(135deg,#fce4ec_0%,#ec407a_55%,#880e4f_100%)]"
            aria-hidden
          />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" aria-hidden />
        <span className="relative text-[10px] font-semibold uppercase tracking-[0.15em] text-white/90">
          {tHome("promoBestProducts")}
        </span>
        <span className="relative mt-1 text-lg font-bold leading-tight">{tHome("heroDiscount")}</span>
        <span className="relative mt-3 inline-flex w-fit items-center bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover">
          {tHome("promoShopNow")}
        </span>
      </Link>
    </div>
  );
}

type Props = {
  categories: Category[];
  promoImageUrl?: string | null;
};

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CategoryMegaMenuInner({ categories, promoImageUrl }: Props) {
  const tNav = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { navCategories } = useMemo(() => buildCategoryTree(categories), [categories]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (navCategories.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="relative flex self-stretch"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex items-center gap-2 border-r border-accent-hover/30 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${open ? "text-accent-hover" : "text-zinc-900"}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <HamburgerIcon />
        {tNav("categories")}
      </button>

      <div
        className={`absolute left-0 top-full z-[60] min-w-[min(100vw-2rem,72rem)] border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <CategoryNavStripPanel
          categories={categories}
          promoImageUrl={promoImageUrl}
          onNavigate={() => setOpen(false)}
        />
      </div>
    </div>
  );
}

export function CategoryMegaMenu(props: Props) {
  const pathname = usePathname();
  return <CategoryMegaMenuInner key={pathname} {...props} />;
}
