import { MIN_ORDER_USD } from "@/lib/currency";
import { SupportPageShell, SupportCards } from "@/components/store/support-page-shell";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "payment" });
  return buildStorefrontMetadata({
    locale,
    path: "/payment",
    title: t("title"),
    description: t("body"),
  });
}

export default async function PaymentPage() {
  const t = await getTranslations("payment");

  const design = await getTranslations("supportDesign");
  return (
    <SupportPageShell activeHref="/payment" title={t("title")} subtitle={design("paymentIntro")}>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p className="font-semibold text-zinc-900">{t("subtitle")}</p>
        <p>{t("body")}</p>
      </div>
      <SupportCards items={[1,2,3,4].map(index => ({ title: design(`payment${index}Title`), body: design(`payment${index}Body`, { amount: MIN_ORDER_USD }) }))} />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("wholesaleCta")}
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("contactCta")}
        </Link>
      </div>
    </SupportPageShell>
  );
}
