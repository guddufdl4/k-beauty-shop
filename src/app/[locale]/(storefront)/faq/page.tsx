import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function FaqPage() {
  const t = await getTranslations("supportPages");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t("faqTitle")}</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{t("faqMoqQuestion")}</h2>
          <p className="mt-2">{t("faqMoqAnswer")}</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{t("faqShippingQuestion")}</h2>
          <p className="mt-2">{t("faqShippingAnswer")}</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{t("faqAuthenticQuestion")}</h2>
          <p className="mt-2">{t("faqAuthenticAnswer")}</p>
        </div>
      </div>
      <div className="mt-10">
        <Link
          href="/wholesale-inquiry"
          className="inline-flex items-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("wholesaleCta")}
        </Link>
      </div>
    </main>
  );
}
