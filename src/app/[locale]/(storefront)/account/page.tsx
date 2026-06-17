import { updateProfileFullName } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ProfileForm } from "@/components/store/profile-form";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const [{ configured, user, profile }, t] = await Promise.all([
    getSessionProfile(),
    getTranslations("account"),
  ]);

  if (configured && !user) {
    redirect("/login");
  }

  const email = profile?.email ?? user?.email ?? "";
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-zinc-600">{isAdmin ? t("adminNotice") : t("nicknameDescription")}</p>

      <div className="mt-8 max-w-md space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="font-medium">{email || "-"}</dd>
            </div>
            {isAdmin ? (
              <div>
                <dt className="text-zinc-500">Role</dt>
                <dd className="font-medium">Admin</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{t("nicknameTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-600">{t("nicknameDescription")}</p>
            <div className="mt-4">
              <ProfileForm action={updateProfileFullName} defaultFullName={profile?.full_name} />
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <a href="/admin" className="inline-block text-sm text-rose-600 hover:underline">
            {t("adminDashboard")}
          </a>
        ) : null}
      </div>
    </main>
  );
}


