import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { signIn } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/store/auth-form";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import { safeStorefrontReturnTo, withReturnTo } from "@/lib/auth/return-to";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildStorefrontMetadata({
    locale,
    path: "/login",
    title: t("loginTitle"),
    description: t("loginSubtitle"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string; next?: string; closed?: string }>;
}) {
  const t = await getTranslations("auth");
  const accountSettings = await getTranslations("accountSettings");
  const { verified, error, next, closed } = await searchParams;
  const returnTo = safeStorefrontReturnTo(next, "/account");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("loginSubtitle")}</p>
      {closed === "1" ? <p role="status" className="mt-4 text-sm text-green-700">{accountSettings("closed")}</p> : null}
      {verified ? <p className="mt-4 text-sm text-green-700">{t("emailConfirmed")}</p> : null}
      {error === "confirm" ? <p className="mt-4 text-sm text-red-600">{t("confirmFailed")}</p> : null}
      <div className="mt-8">
        <AuthForm
          action={signIn}
          returnTo={returnTo}
          submitLabel={t("loginButton")}
          emailLabel={t("loginIdentifier")}
          passwordLabel={t("password")}
          pendingLabel={t("processing")}
          footer={
            <p className="text-center text-sm text-zinc-600">
              {t("noAccount")}{" "}
              <Link href={withReturnTo("/signup", returnTo)} className="text-violet-700 hover:underline">
                {t("signupTitle")}
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}
