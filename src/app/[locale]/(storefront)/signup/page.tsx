import { getTranslations } from "next-intl/server";
import { signUp } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/store/auth-form";

export default async function SignUpPage() {
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("signupSubtitle")}</p>
      <div className="mt-8">
        <AuthForm
          action={signUp}
          submitLabel={t("signupButton")}
          emailLabel={t("email")}
          passwordLabel={t("password")}
          pendingLabel={t("processing")}
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

