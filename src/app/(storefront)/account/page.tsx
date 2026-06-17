import Link from "next/link";
import { NicknameForm } from "@/components/store/nickname-form";
import { updateProfileNickname } from "@/app/actions/auth";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export default async function AccountPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="mt-4 text-zinc-600">로그인이 필요합니다.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          로그인
        </Link>
      </main>
    );
  }

  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-bold">마이페이지</h1>
      <p className="mt-2 text-sm text-zinc-500">{user.email}</p>

      {isAdmin ? (
        <div className="mt-8 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          관리자 계정 — 헤더에는 <strong>관리자</strong>로 표시됩니다.
          <div className="mt-3">
            <Link href="/admin" className="font-semibold hover:underline">
              관리자 대시보드 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">닉네임 설정</h2>
          <p className="mt-1 text-sm text-zinc-500">
            쇼핑몰 상단에 표시될 이름을 설정하세요.
          </p>
          <div className="mt-4">
            <NicknameForm
              action={updateProfileNickname}
              defaultNickname={profile?.full_name}
            />
          </div>
        </div>
      )}
    </main>
  );
}
