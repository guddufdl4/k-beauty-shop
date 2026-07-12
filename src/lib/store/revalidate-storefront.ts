import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

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
