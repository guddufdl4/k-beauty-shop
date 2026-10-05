import { MIN_ORDER_USD } from "@/lib/currency";
import { SupportPageShell, SupportCards } from "@/components/store/support-page-shell";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "supportPages" });
  return buildStorefrontMetadata({
    locale,
    path: "/shipping",
    title: t("shippingTitle"),
    description: t("shippingBody"),
  });
}

export default async function ShippingPage() {
  const t = await getTranslations("supportPages");

  const design = await getTranslations("supportDesign");
  return (
    <SupportPageShell activeHref="/shipping" title={t("shippingTitle")} subtitle={design("shippingIntro")}>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>{t("shippingBody")}</p>
      </div>
      <SupportCards items={[1,2,3,4].map(index => ({ title: design(`shipping${index}Title`), body: design(`shipping${index}Body`, { amount: MIN_ORDER_USD }) }))} />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("wholesaleCta")}
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("productsCta")}
        </Link>
      </div>
    </SupportPageShell>
  );
}
