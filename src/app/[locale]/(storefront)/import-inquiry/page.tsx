import { getTranslations, getLocale } from "next-intl/server";
import { SupportPageShell } from "@/components/store/support-page-shell";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { ImportInquiryForm } from "@/components/store/import-inquiry-form";
export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("importInquiry");
  return buildStorefrontMetadata({ locale, path: "/import-inquiry", title: t("title"), description: t("intro") });
}
export default async function ImportInquiryPage() {
  const t = await getTranslations("importInquiry");
  return <SupportPageShell showResources={false} activeHref="/import-inquiry" title={t("title")} subtitle={t("intro")}><p className="mb-6 text-sm leading-6 text-zinc-600">{t("notice")}</p><ImportInquiryForm /></SupportPageShell>;
}
