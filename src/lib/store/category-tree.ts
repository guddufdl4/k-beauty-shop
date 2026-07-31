import type { Category } from "@/lib/supabase/products";
import {
  compareCategoriesByDisplayName,
  filterStorefrontCategories,
  getLocalizedCategoryName,
  pickStorefrontNavCategories,
} from "@/lib/store/localized-category";
import { CATEGORY_TAXONOMY, type StorefrontNavSlug } from "@/lib/store/category-taxonomy";

export type CategoryColumn = {
  parent: Category;
  children: Category[];
};

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

export function buildCategoryTree(categories: Category[], locale = "en"): {
  topLevel: Category[];
  childrenByParentId: Map<string, Category[]>;
  columns: CategoryColumn[];
  hasHierarchy: boolean;
  navCategories: Category[];
} {
  const visibleCategories = filterStorefrontCategories(categories);

  const topLevel = visibleCategories
    .filter((category) => !category.parent_id)
    .sort((a, b) => compareCategoriesByDisplayName(a, b, locale));

  const childrenByParentId = new Map<string, Category[]>();

  for (const category of visibleCategories) {
    if (!category.parent_id) {
      continue;
    }
    const siblings = childrenByParentId.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parent_id, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((a, b) => compareCategoriesByDisplayName(a, b, locale));
  }

  const columns: CategoryColumn[] = topLevel.map((parent) => ({
    parent,
    children: childrenByParentId.get(parent.id) ?? [],
  }));

  return {
    topLevel,
    childrenByParentId,
    columns,
    hasHierarchy: childrenByParentId.size > 0,
    navCategories: pickStorefrontNavCategories(visibleCategories),
  };
}

export function sortCategoriesForNav(
  parentSlug: StorefrontNavSlug,
  categories: Category[],
  locale: string,
): Category[] {
  const order = (CATEGORY_TAXONOMY[parentSlug] ?? []).flatMap((node) => [
    node.slug,
    ...(node.children ?? []).map((child) => child.slug),
  ]);
  const rank = new Map(order.map((slug, index) => [slug, index]));

  return [...categories].sort((a, b) => {
    const aRank = rank.get(a.slug);
    const bRank = rank.get(b.slug);
    if (aRank != null && bRank != null) {
      return aRank - bRank;
    }
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return getLocalizedCategoryName(a, locale).localeCompare(
      getLocalizedCategoryName(b, locale),
      locale === "ko" ? "ko" : locale === "ja" ? "ja" : locale === "zh" ? "zh" : "en",
      { sensitivity: "base", numeric: true },
    );
  });
}

export function collectDescendantCategoryIds(
  categoryId: string,
  childrenByParentId: Map<string, Category[]>,
): string[] {
  const ids = [categoryId];
  for (const child of childrenByParentId.get(categoryId) ?? []) {
    ids.push(...collectDescendantCategoryIds(child.id, childrenByParentId));
  }
  return ids;
}

export function resolveCategoryIdsForFilter(
  categories: Category[],
  categorySlug: string,
): string[] | null {
  const visibleCategories = filterStorefrontCategories(categories);
  const target = visibleCategories.find((category) => category.slug === categorySlug);
  if (!target) {
    return null;
  }

  const { childrenByParentId } = buildCategoryTree(visibleCategories);
  return collectDescendantCategoryIds(target.id, childrenByParentId);
}

export function findNavAncestorCategory(
  categories: Category[],
  activeCategory: Category | null | undefined,
  navCategories: Category[],
): Category | null {
  if (!activeCategory) {
    return null;
  }

  const navIds = new Set(navCategories.map((category) => category.id));
  let current: Category | undefined = activeCategory;

  while (current) {
    if (navIds.has(current.id)) {
      return current;
    }
    if (!current.parent_id) {
      return null;
    }
    current = categories.find((category) => category.id === current!.parent_id);
  }

  return null;
}