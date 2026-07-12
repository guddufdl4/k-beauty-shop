"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={className}>
      <span className="sr-only">{t("label")}</span>
      <select
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
        value={locale}
        onChange={(event) => {
          router.replace(pathname, { locale: event.target.value });
          router.refresh();
        }}
        aria-label={t("label")}
      >
        {routing.locales.map((nextLocale) => (
          <option key={nextLocale} value={nextLocale}>
            {t(nextLocale)}
          </option>
        ))}
      </select>
    </label>
  );
}
