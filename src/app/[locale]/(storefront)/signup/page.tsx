import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { signUp } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/store/signup-form";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildStorefrontMetadata({
    locale,
    path: "/signup",
    title: t("signupTitle"),
    description: t("signupSubtitle"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("signupSubtitle")}</p>
      <div className="mt-8">
        <SignupForm
          action={signUp}
          labels={{
            country: t("country"),
            company: t("company"),
            companyHint: t("companyHint"),
            email: t("email"),
            emailHint: t("emailHint"),
            name: t("name"),
            username: t("username"),
            usernameHint: t("usernameHint"),
            password: t("password"),
            passwordConfirm: t("passwordConfirm"),
            currency: t("currency"),
            submit: t("signupButton"),
            pending: t("processing"),
          }}
          footer={
            <p className="text-center text-sm text-zinc-600">
              {t("hasAccount")}{" "}
              <Link href="/login" className="text-rose-600 hover:underline">
                {t("loginTitle")}
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}

