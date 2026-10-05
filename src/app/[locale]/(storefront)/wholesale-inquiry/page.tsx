import { SupportPageShell } from "@/components/store/support-page-shell";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { WholesaleInquiryForm } from "./wholesale-inquiry-form";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "wholesaleInquiry" });
  return buildStorefrontMetadata({
    locale,
    path: "/wholesale-inquiry",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function WholesaleInquiryPage() {
  const t = await getTranslations("wholesaleInquiry");

  return (
    <SupportPageShell activeHref="/wholesale-inquiry" title={t("title")}>
      <p className="text-sm font-medium uppercase tracking-widest text-accent">{t("eyebrow")}</p>

      <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">{t("subtitle")}</p>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("paymentNotice")}</p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <WholesaleInquiryForm />
      </div>
    </SupportPageShell>
  );
}
