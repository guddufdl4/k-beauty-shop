import { routing } from "@/i18n/routing";

const FALLBACK_SITE_URL = "https://hmtkorea.com";

export const PUBLIC_STORE_NAME = "HMT Korea";

/** On-screen brand only. Does not invent a legal entity name. */
export function displayPublicStoreName(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return PUBLIC_STORE_NAME;
  }

  const key = trimmed.replace(/\s+/g, " ").toLowerCase();
  if (key === "hmt korea" || key === "hmtkorea" || key === "hmt") {
    return PUBLIC_STORE_NAME;
  }
  if (key === "k-beauty shop" || key === "k beauty shop") {
    return PUBLIC_STORE_NAME;
  }
  if (key.includes("k-beauty global")) {
    return PUBLIC_STORE_NAME;
  }

  return trimmed;
}

export function resolveSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return FALLBACK_SITE_URL;
}

export function localePath(locale: string, path = ""): string {
  const suffix = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `/${locale}${suffix}`;
}

export function absoluteLocaleUrl(locale: string, path = ""): string {
  return `${resolveSiteUrl()}${localePath(locale, path)}`;
}

export function defaultLocaleUrl(path = ""): string {
  return absoluteLocaleUrl(routing.defaultLocale, path);
}
