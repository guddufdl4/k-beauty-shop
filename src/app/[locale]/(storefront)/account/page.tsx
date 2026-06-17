import { getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { updateProfileFullName } from "@/app/actions/profile";
import { ProfileForm } from "@/components/store/profile-form";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { configured, user, profile } = await getSessionProfile();

  if (configured && !user) {
    redirect({ href: "/login", locale: await getLocale() });
  }

  const email = profile?.email ?? user?.email ?? "";
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">마이페이지</h1>
      <p className="mt-2 text-zinc-600">
        {isAdmin ? "관리자 계정" : "내 계정 정보를 관리합니다."}
      </p>

      <div className="mt-8 max-w-md space-y-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">계정</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">이메일</dt>
              <dd className="font-medium">{email || "—"}</dd>
            </div>
            {isAdmin ? (
              <div>
                <dt className="text-zinc-500">역할</dt>
                <dd className="font-medium">관리자</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">프로필</h2>
            <p className="mt-1 text-sm text-zinc-600">
              닉네임을 설정하면 헤더 메뉴에 표시됩니다.
            </p>
            <div className="mt-4">
              <ProfileForm
                action={updateProfileFullName}
                defaultFullName={profile?.full_name}
              />
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <Link
            href="/admin"
            className="inline-block text-sm text-rose-600 hover:underline"
          >
            관리자 페이지로 이동
          </Link>
        ) : null}
      </div>
    </main>
  );
}
