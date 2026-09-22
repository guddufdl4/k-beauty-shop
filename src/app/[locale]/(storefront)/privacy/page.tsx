import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildStorefrontMetadata({
    locale,
    path: "/privacy",
    title: t("privacyTitle"),
    description: t("privacyIntro"),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">{t("privacyEyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{t("privacyTitle")}</h1>

      <div className="prose prose-zinc mt-10 max-w-none text-sm leading-relaxed text-zinc-700">
        <p>{t("privacyIntro")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("privacyUseTitle")}</h2>
        <p>{t("privacyUseBody")}</p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">{t("privacyContactTitle")}</h2>
        <p>{t("privacyContactBody")}</p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/terms" className="text-sm font-semibold text-rose-600 hover:underline">
          {t("termsTitle")}
        </Link>
        <Link href="/contact" className="text-sm font-semibold text-rose-600 hover:underline">
          Contact
        </Link>
      </div>
    </main>
  );
}
