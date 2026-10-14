import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ko", "ja", "zh", "vi", "id", "th", "ru", "kk", "uz", "ky", "tg", "tk"] as const;
/** New translations remain outside search indexing until content review is complete. */
export const indexedLocales = ["en", "ko", "ja", "zh", "vi", "id", "th"] as const;
export const isIndexedLocale = (locale: string) => (indexedLocales as readonly string[]).includes(locale);

export type AppLocale = (typeof locales)[number];
export type Locale = AppLocale;

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  /** Keep /en unless the URL already has a locale prefix or the user picks one in the switcher. */
  localeDetection: false,
});