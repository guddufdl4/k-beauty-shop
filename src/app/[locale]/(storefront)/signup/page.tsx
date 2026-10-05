import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { signUp } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/store/signup-form";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import { safeStorefrontReturnTo } from "@/lib/auth/return-to";

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

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  const returnTo = safeStorefrontReturnTo(next, "/account");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("signupSubtitle")}</p>
      <div className="mt-8">
        <SignupForm
          action={signUp}
          returnTo={returnTo}
          labels={{
            phone: t("phone"),
            phoneHint: t("phoneHint"),
            phoneCountry: t("phoneCountry"),
            country: t("country"),
            company: t("company"),
            companyHint: t("companyHint"),
            email: t("email"),
            emailHint: t("emailHint"),
            name: t("name"),
            password: t("password"),
            passwordHint: t("passwordHint"),
            passwordConfirm: t("passwordConfirm"),
            passwordMatch: t("passwordMatch"),
            passwordMismatch: t("passwordMismatch"),
            currency: t("currency"),
            acceptTerms: t("acceptTerms"),
            acceptPrivacy: t("acceptPrivacy"),
            terms: t("termsLink"),
            privacy: t("privacyLink"),
            submit: t("signupButton"),
            pending: t("processing"),
            benefitsTitle: t("benefitsTitle"),
            benefitPrices: t("benefitPrices"),
            benefitMoq: t("benefitMoq"),
            benefitQuotes: t("benefitQuotes"),
            resend: t("resendEmail"),
            resendPending: t("resendPending"),
          }}
          footer={
            <p className="text-center text-sm text-zinc-600">
              {t("hasAccount")}{" "}
              <Link href="/login" className="text-violet-700 hover:underline">
                {t("loginTitle")}
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}
