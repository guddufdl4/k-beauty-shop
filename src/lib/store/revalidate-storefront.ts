import { revalidatePath, revalidateTag } from "next/cache";
import { routing } from "@/i18n/routing";
import { STOREFRONT_PRIORITY_PRODUCTS_CACHE_TAG } from "@/lib/supabase/products";

/** Revalidate a storefront path for every supported locale (e.g. "/products"). */
export function revalidateStorefrontPath(path: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${normalized === "/" ? "" : normalized}`);
  }
}

export function revalidateStorefrontLayout(): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`, "layout");
  }
}

/** Revalidate homepage product grids after image uploads or catalog changes. */
export function revalidateStorefrontHome(): void {
  revalidateTag(STOREFRONT_PRIORITY_PRODUCTS_CACHE_TAG, "max");
  revalidateStorefrontPath("/");
}
