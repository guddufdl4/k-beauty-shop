import { routing } from "@/i18n/routing";

/** Default storefront entry (matches routing.defaultLocale, currently /en). */
export function storefrontHref(path: string = ""): string {
  const suffix = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";
  return `/${routing.defaultLocale}${suffix}`;
}
