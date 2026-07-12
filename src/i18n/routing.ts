import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ko", "ja", "zh"] as const;
export type AppLocale = (typeof locales)[number];
export type Locale = AppLocale;

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  /** Keep /en unless the URL already has a locale prefix or the user picks one in the switcher. */
  localeDetection: false,
});