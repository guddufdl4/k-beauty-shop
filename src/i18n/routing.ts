import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ko", "ja", "zh"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
