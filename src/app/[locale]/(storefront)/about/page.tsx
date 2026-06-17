import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const COMPANY_NAME = "(��)�t���Ү\���";

export default async function AboutPage() {
  const [t, footerT] = await Promise.all([
    getTranslations("about"),
    getTranslations("footer"),
  ]);

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          {t("title")}
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600 sm:text-base">
          <p>
            <strong className="text-zinc-900">{COMPANY_NAME}</strong>
            {t("introSuffix")}
          </p>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">{t("areasTitle")}</h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>{t("area1")}</li>
              <li>{t("area2")}</li>
              <li>{t("area3")}</li>
              <li>{t("area4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">{t("shopTitle")}</h2>
            <p className="mt-3">{t("shopDescription")}</p>
          </section>
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

      <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-xs text-zinc-500">
        <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/about" className="font-medium text-rose-600">
            {footerT("about")}
          </Link>
          <span aria-hidden="true" className="text-zinc-300">
            �
          </span>
          <Link href="/terms" className="hover:text-rose-600 hover:underline">
            {footerT("terms")}
          </Link>
        </nav>
        <p>{footerT("copyright")}</p>
      </footer>
    </>
  );
}
