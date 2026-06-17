import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/store/auth-form";
import { signIn } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-2 text-zinc-600">{t("loginSubtitle")}</p>
      <div className="mt-8">
        <AuthForm
          action={signIn}
          submitLabel={t("loginButton")}
          emailLabel={t("email")}
          passwordLabel={t("password")}
          processingLabel={t("processing")}
          footer={
            <p className="text-center text-sm text-zinc-600">
              {t("noAccount")}{" "}
              <Link href="/signup" className="text-rose-600 hover:underline">
                {t("signupTitle")}
              </Link>
            </p>
          }
        />
      </div>
    </main>
  );
}
