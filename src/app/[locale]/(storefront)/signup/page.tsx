import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { signUp } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/store/signup-form";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import { safeStorefrontReturnTo } from "@/lib/auth/return-to";
import { getPublicSiteContact, getSiteSettings } from "@/lib/site-settings";

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
  const legal = await getTranslations("legal");
  const contact = getPublicSiteContact(await getSiteSettings());
  const contactText = [contact.store_name, contact.company_address, contact.public_email, contact.public_phone, contact.public_whatsapp].filter(Boolean).join(" · ");
  const { next } = await searchParams;
  const returnTo = safeStorefrontReturnTo(next, "/account");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("signupSubtitle")}</p>
      <div className="mt-8">
        <SignupForm
          policies={{
            terms: [legal("termsEffective"), legal("termsIntro"), ...["Scope", "Services", "Accounts", "Orders"].map((section) => `${legal(`terms${section}Title`)}\n${legal(`terms${section}Body`)}`), contactText],
            privacy: [legal("privacyIntro"), `${legal("privacyUseTitle")}\n${legal("privacyUseBody")}`, `${legal("privacyContactTitle")}\n${legal("privacyContactBody")}`, contactText],
          }}
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
