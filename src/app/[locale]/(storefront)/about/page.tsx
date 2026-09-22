import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "about" });
  return buildStorefrontMetadata({
    locale,
    path: "/about",
    title: t("title"),
    description: `${t("companyName")}${t("introSuffix")}`,
  });
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const companyName = t("companyName");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{t("title")}</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>
          <strong className="text-zinc-900">{companyName}</strong>
          {t("introSuffix")}
        </p>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("shopTitle")}</h2>
          <p className="mt-2">{t("shopDescription")}</p>
        </div>
      </div>

      <div className="mt-10">
        <Link
          href="/products"
          className="inline-flex items-center rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {t("viewProducts")}
        </Link>
      </div>
    </main>
  );
}
