import { getTranslations } from "next-intl/server";
import { WholesaleInquiryForm } from "./wholesale-inquiry-form";

export default async function WholesaleInquiryPage() {
  const t = await getTranslations("wholesaleInquiry");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{t("title")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">{t("subtitle")}</p>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("paymentNotice")}</p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <WholesaleInquiryForm />
      </div>
    </main>
  );
}
