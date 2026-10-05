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
    path: "/returns",
    title: t("returnsTitle"),
    description: t("returnsBody"),
  });
}

export default async function ReturnsPage() {
  const t = await getTranslations("supportPages");

  const design = await getTranslations("supportDesign");
  return (
    <SupportPageShell activeHref="/returns" title={t("returnsTitle")} subtitle={design("returnsIntro")}>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>{t("returnsBody")}</p>
      </div>
      <SupportCards items={[1,2,3,4].map(index => ({ title: design(`returns${index}Title`), body: design(`returns${index}Body`, { amount: MIN_ORDER_USD }) }))} />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/contact"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("contactCta")}
        </Link>
      </div>
    </SupportPageShell>
  );
}
