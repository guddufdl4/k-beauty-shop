import { MIN_ORDER_USD } from "@/lib/currency";
import { SupportPageShell } from "@/components/store/support-page-shell";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "supportPages" });
  return buildStorefrontMetadata({
    locale,
    path: "/faq",
    title: t("faqTitle"),
    description: t("faqMoqAnswer"),
  });
}

export default async function FaqPage() {
  const t = await getTranslations("supportPages");

  const design = await getTranslations("supportDesign");
  return (
    <SupportPageShell activeHref="/faq" title={t("faqTitle")} subtitle={design("faqIntro")}>

      <div className="mt-8 divide-y divide-zinc-100">
        {["Approval", "Minimum", "Moq", "Invoice", "Payment", "Shipping", "Existing", "Authentic"].map((key,index) => (
          <details key={key} open={index===0} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-zinc-900">
              {['Moq','Shipping','Authentic'].includes(key) ? t(`faq${key}Question`) : design(`faq${key}Question`)}<span aria-hidden className="text-xl font-normal text-accent group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 pr-6 text-sm text-zinc-600">{['Moq','Shipping','Authentic'].includes(key) ? t(`faq${key}Answer`) : design(`faq${key}Answer`, { amount: MIN_ORDER_USD })}</p>
          </details>
        ))}
      </div>
      <div className="mt-10">
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("wholesaleCta")}
        </Link>
      </div>
    </SupportPageShell>
  );
}
