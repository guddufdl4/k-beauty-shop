import Link from "next/link";
import { AdminStatCard } from "@/components/admin/stat-card";
import { getAdminOrderStats } from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";
import { getTossStatusMessage, isTossConfigured } from "@/lib/toss";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { configured, user, profile, profileError } = await getSessionProfile();
  const stats = await getAdminOrderStats();

  if (configured && (!user || profile?.role !== "admin")) {
    const accessMessage = !user
      ? "관리자 계정으로 로그인하세요."
      : profileError
        ? "프로필을 불러오지 못했습니다. Supabase RLS·profiles 행을 확인하세요."
        : !profile
          ? "profiles 행이 없습니다. 회원가입 후 SQL로 admin 역할을 지정하세요."
          : `현재 역할(${profile.role})은 관리자(admin)가 아닙니다.`;

    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 대시보드</h1>
        <p className="mt-4 text-zinc-600">{accessMessage}</p>
        {user ? (
          <p className="mt-2 font-mono text-xs text-zinc-500">
            user id: {user.id}
            {user.email ? ` · email: ${user.email}` : null}
            {profile ? ` · role: ${profile.role}` : null}
            {profileError ? ` · profile error: ${profileError}` : null}
          </p>
        ) : null}
        <Link
          href={user ? storefrontHref() : storefrontHref("/login")}
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {user ? "홈으로" : "로그인"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-zinc-500">
        K-Beauty Shop 주문·상품을 관리합니다.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="전체 주문" value={String(stats.total)} />
        <AdminStatCard label="결제 대기" value={String(stats.pending)} />
        <AdminStatCard label="결제 완료" value={String(stats.paid)} />
      </div>

      <nav className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/orders"
          className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          주문 관리
        </Link>
        <Link
          href="/admin/products"
          className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          상품 관리
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          사이트 설정
        </Link>
      </nav>

      <p className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
        {getTossStatusMessage()}
        {isTossConfigured() ? "" : " (Phase 6b)"}
      </p>

      {!configured ? (
        <p className="mt-4 text-sm text-amber-700">
          Supabase 미연결 — 데모 주문은 현재 브라우저 쿠키 기준으로 집계됩니다.
        </p>
      ) : null}
    </main>
  );
}
