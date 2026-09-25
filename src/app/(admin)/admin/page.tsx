import Link from "next/link";
import { AdminStatCard } from "@/components/admin/stat-card";
import { getAdminOrderStats } from "@/lib/admin/orders";
import { getStorefrontVisitStats } from "@/lib/admin/visits";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";
import { getTossStatusMessage, isTossConfigured } from "@/lib/toss";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { configured, user, profile, profileError } = await getSessionProfile();
  const [stats, visitStats] = await Promise.all([
    getAdminOrderStats(),
    getStorefrontVisitStats(),
  ]);

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
        <AdminStatCard label="견적 요청" value={String(stats.quotes)} />
        <AdminStatCard label="결제 완료" value={String(stats.paid)} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">오늘 접속</h2>
        <p className="mt-1 text-sm text-zinc-500">
          관리자 계정으로 스토어를 보면 집계되지 않습니다. 다른 사람 방문만 표시합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminStatCard
            label="오늘 방문자"
            value={visitStats.available ? String(visitStats.todayVisitors) : "—"}
          />
          <AdminStatCard
            label="오늘 페이지뷰"
            value={visitStats.available ? String(visitStats.todayViews) : "—"}
          />
          <AdminStatCard
            label="어제 방문자"
            value={visitStats.available ? String(visitStats.yesterdayVisitors) : "—"}
          />
        </div>
        {visitStats.available && visitStats.last7Days.length > 0 ? (
          <ul className="mt-4 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2">
            {visitStats.last7Days.map((day) => (
              <li key={day.date} className="flex justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
                <span>{day.date}</span>
                <span>
                  방문자 {day.visitors} · 페이지뷰 {day.views}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {!visitStats.available ? (
          <p className="mt-3 text-sm text-amber-700">
            방문 집계 테이블이 아직 없습니다. supabase/migrations/018_storefront_visits.sql 을 적용하면 표시됩니다.
          </p>
        ) : null}
      </section>

      <nav className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/members"
          className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          회원
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
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
