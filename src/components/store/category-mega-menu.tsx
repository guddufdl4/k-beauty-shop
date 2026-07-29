"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CategoryIcon, DownArrowIcon } from "@/lib/store/category-icons";
import { buildCategoryTree } from "@/lib/store/category-tree";
import {
  getEnglishCategoryName,
  getLocalizedCategoryName,
} from "@/lib/store/localized-category";
import { buildProductsHref } from "@/lib/store/products-url";
import type { Category } from "@/lib/supabase/products";

const HOME_CATEGORY_SLUGS = [
  "skincare",
  "makeup",
  "mask-pack",
  "suncare",
  "haircare",
  "bodycare",
  "body-care",
] as const;

function pickHomeCategories(categories: Category[]): Category[] {
  const { topLevel } = buildCategoryTree(categories);
  const bySlug = new Map(topLevel.map((category) => [category.slug, category]));

  const ordered: Category[] = [];
  for (const slug of HOME_CATEGORY_SLUGS) {
    const category = bySlug.get(slug);
    if (category) {
      ordered.push(category);
      bySlug.delete(slug);
    }
  }

  for (const category of topLevel) {
    if (bySlug.has(category.slug)) {
      ordered.push(category);
    }
  }

  return ordered.slice(0, 6);
}

type StripPanelProps = {
  categories: Category[];
  promoImageUrl?: string | null;
  onNavigate?: () => void;
};

function CategoryNavStripPanel({ categories, promoImageUrl, onNavigate }: StripPanelProps) {
  const locale = useLocale();
  const tHome = useTranslations("home");

  const visibleCategories = pickHomeCategories(categories);
  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <div className="flex overflow-hidden bg-white">
      <div className="flex min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleCategories.map((category, index) => {
          const englishName = getEnglishCategoryName(category);
          const localizedName = getLocalizedCategoryName(category, locale);
          const subtitle = tHome("categoryNavSubtitle", { category: localizedName });

          return (
            <Link
              key={category.id}
              href={buildProductsHref({ category: category.slug })}
              className={`group flex min-w-[7.5rem] flex-1 flex-col items-center px-3 py-5 text-center transition-colors hover:bg-accent-soft/40 sm:min-w-[8.5rem] sm:px-4 sm:py-6 lg:min-w-0 ${
                index < visibleCategories.length - 1 ? "border-r border-zinc-200" : ""
              }`}
              onClick={onNavigate}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white sm:h-16 sm:w-16">
                <CategoryIcon slug={category.slug} className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
              <span className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-900 sm:text-sm">
                {englishName}
              </span>
              <span className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{subtitle}</span>
              <span className="mt-2 text-accent transition-transform group-hover:translate-y-0.5">
                <DownArrowIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </Link>
          );
        })}
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

  const visibleCategories = pickHomeCategories(categories);

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

  if (visibleCategories.length === 0) {
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
        className={`absolute left-0 top-full z-[60] min-w-[min(100vw-2rem,64rem)] border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-200 ease-out ${
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
