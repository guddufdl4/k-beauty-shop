export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(
  amount: number,
  currency: string = "KRW",
  locale: string = "ko-KR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatKRW(amount: number): string {
  return formatPrice(amount);
}

const UNDETERMINED_LABEL: Record<string, string> = {
  ko: "\uAC00\uACA9 \uBBF8\uC815",
  en: "Price TBD",
  ja: "\u4FA1\u683C\u672A\u5B9A",
  zh: "\u4EF7\u683C\u672A\u5B9A",
};

export function usesKrw(locale: string): boolean {
  return locale === "ko";
}

export function convertKrwToUsd(amountKrw: number, usdKrwRate: number): number {
  return amountKrw / usdKrwRate;
}

export function formatLocalePrice(
  amountKrw: number,
  locale: string,
  usdKrwRate: number,
): string {
  if (usesKrw(locale)) {
    return formatPrice(amountKrw);
  }

  const usd = convertKrwToUsd(amountKrw, usdKrwRate);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function formatLocaleProductPrice(
  amountKrw: number,
  locale: string,
  usdKrwRate: number,
): string {
  if (amountKrw <= 1) {
    return UNDETERMINED_LABEL[locale] ?? UNDETERMINED_LABEL.en;
  }
  return formatLocalePrice(amountKrw, locale, usdKrwRate);
}

/** Placeholder import prices (legacy 1 won) show as undetermined. */
export function formatProductPrice(amount: number): string {
  if (amount <= 1) {
    return "\uAC00\uACA9 \uBBF8\uC815";
  }
  return formatKRW(amount);
}

export function isUndeterminedProductPrice(amount: number): boolean {
  return amount <= 1;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
