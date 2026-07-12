"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buildProductsHref } from "@/lib/store/products-url";
import { getCategorySortLocale } from "@/lib/store/localized-category";
import type { Category } from "@/lib/supabase/products";

type Props = {
  categories: Category[];
  activeCategorySlug?: string;
  searchQuery?: string;
};

const selectClassName =
  "w-full min-w-0 appearance-none rounded-md border-2 border-accent-hover/50 bg-white bg-[length:0.875rem] bg-[position:right_0.875rem_center] bg-no-repeat px-3.5 py-2.5 pr-9 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:border-accent-hover focus:border-accent-hover focus:outline-none focus:ring-2 focus:ring-accent-soft sm:min-w-[13rem]";

function ChevronBackground() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="block min-w-0 flex-1 sm:flex-none">
      <span className="mb-2 block text-xs font-semibold tracking-wide text-zinc-800">
        {label}
      </span>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectClassName}
        >
          {children}
        </select>
        <ChevronBackground />
      </div>
    </label>
  );
}

export function ProductCategoryFilter({
  categories,
  activeCategorySlug,
  searchQuery,
}: Props) {
  const t = useTranslations("products");
  const router = useRouter();
  const locale = useLocale();
  const sortLocale = getCategorySortLocale(locale);

  const { topLevel, childrenByParentId, hasHierarchy } = useMemo(() => {
    const top = categories.filter((category) => !category.parent_id);
    const childMap = new Map<string, Category[]>();

    for (const category of categories) {
      if (!category.parent_id) {
        continue;
      }
      const siblings = childMap.get(category.parent_id) ?? [];
      siblings.push(category);
      childMap.set(category.parent_id, siblings);
    }

    for (const siblings of childMap.values()) {
      siblings.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, sortLocale));
    }

    return {
      topLevel: top,
      childrenByParentId: childMap,
      hasHierarchy: childMap.size > 0,
    };
  }, [categories, sortLocale]);

  const activeCategory = activeCategorySlug
    ? categories.find((category) => category.slug === activeCategorySlug)
    : null;

  const activeParent = activeCategory?.parent_id
    ? categories.find((category) => category.id === activeCategory.parent_id)
    : activeCategory;

  const mainValue = activeParent?.slug ?? "";
  const subcategories = activeParent ? (childrenByParentId.get(activeParent.id) ?? []) : [];
  const showSubcategory = hasHierarchy && Boolean(activeParent) && subcategories.length > 0;
  const subValue = activeCategory?.parent_id
    ? activeCategory.slug
    : activeParent?.slug ?? "";

  function navigate(category?: string) {
    router.push(
      buildProductsHref({
        category: category || undefined,
        q: searchQuery,
      }),
    );
  }

  function handleMainChange(value: string) {
    navigate(value || undefined);
  }

  function handleSubChange(value: string) {
    navigate(value || undefined);
  }

  if (!hasHierarchy) {
    return (
      <div className="mb-8 rounded-lg border-2 border-accent-hover bg-zinc-50/80 p-4 sm:p-5">
        <SelectField
          id="product-category"
          label={t("categoryFilter")}
          value={activeCategorySlug ?? ""}
          onChange={handleMainChange}
        >
          <option value="">{t("all")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectField>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border-2 border-accent-hover bg-zinc-50/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
        <SelectField
          id="product-category"
          label={t("categoryFilter")}
          value={mainValue}
          onChange={handleMainChange}
        >
          <option value="">{t("all")}</option>
          {topLevel.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectField>

        {showSubcategory ? (
          <SelectField
            id="product-subcategory"
            label={t("subcategoryFilter")}
            value={subValue}
            onChange={handleSubChange}
          >
            <option value={activeParent!.slug}>{t("allInCategory", { category: activeParent!.name })}</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
    </div>
  );
}
