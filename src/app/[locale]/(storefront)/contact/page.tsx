import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSettings, getPublicSiteContact } from "@/lib/site-settings";

export default async function ContactPage() {
  const [t, settings] = await Promise.all([getTranslations("supportPages"), getSiteSettings()]);
  const { public_email: email } = getPublicSiteContact(settings);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t("contactTitle")}</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>{t("contactBody")}</p>
        {email ? (
          <p>
            {t("contactEmailLabel")}:{" "}
            <a href={`mailto:${email}`} className="font-medium text-accent hover:underline">
              {email}
            </a>
          </p>
        ) : null}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
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
