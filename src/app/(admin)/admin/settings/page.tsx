import Link from "next/link";
import { AdminSettingsForm } from "@/components/admin/settings-form";
import { getSiteSettings } from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { configured, user, profile } = await getSessionProfile();
  const settings = await getSiteSettings();

  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 사이트 설정</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase가 설정되지 않았습니다.{" "}
          <code className="text-xs">.env.local</code>에 URL과 anon key를 추가하세요.
        </p>
        <Link href="/admin" className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          ← 대시보드
        </Link>
      </main>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 사이트 설정</h1>
        <p className="mt-4 text-zinc-600">관리자 계정으로 로그인해야 설정을 변경할 수 있습니다.</p>
        <Link
          href={user ? "/admin" : storefrontHref("/login")}
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {user ? "대시보드로" : "로그인"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-rose-500">Admin</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">사이트 설정</h1>
          <p className="mt-2 text-sm text-zinc-500">
            쇼핑몰 이름, 공지 배너, B2B 표시 문구를 코드 수정 없이 변경합니다.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-rose-600">
          ← 대시보드
        </Link>
      </div>

      <AdminSettingsForm initialSettings={settings} />
    </main>
  );
}