import type { Category } from "@/lib/supabase/products";

export type CategoryColumn = {
  parent: Category;
  children: Category[];
};

export function buildCategoryTree(categories: Category[]): {
  topLevel: Category[];
  childrenByParentId: Map<string, Category[]>;
  columns: CategoryColumn[];
  hasHierarchy: boolean;
} {
  const topLevel = categories
    .filter((category) => !category.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));

  const childrenByParentId = new Map<string, Category[]>();

  for (const category of categories) {
    if (!category.parent_id) {
      continue;
    }
    const siblings = childrenByParentId.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parent_id, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
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
  };
}