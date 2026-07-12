import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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
