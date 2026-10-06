import { createServiceClient } from "@/lib/supabase/service";
import { canManageMembers, canManageMemberTarget, memberGradeLabel } from "@/lib/auth/member-access";
import { MemberApprovalForm } from "./member-approval-form";
import Link from "next/link";
import {
  ADMIN_MEMBERS_PAGE_SIZE,
  buildAdminMembersHref,
  formatMemberJoinedAt,
  listAdminMembers,
  memberRoleLabel,
  parseAdminMembersPage,
} from "@/lib/admin/members";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";

export const dynamic = "force-dynamic";

type AdminMembersPageProps = {
  searchParams: Promise<{ q?: string; page?: string | string[] }>;
};

export default async function AdminMembersPage({ searchParams }: AdminMembersPageProps) {
  const { configured, user, profile } = await getSessionProfile();
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const requestedPage = parseAdminMembersPage(params.page);
  const { members, total, page, totalPages, available, error } = await listAdminMembers(
    query,
    requestedPage,
  );
  const service = createServiceClient();
  const evidenceResult = service && members.length && canManageMembers(profile) ? await service.from("business_documents").select("user_id,file_path,business_number,submitted_at").in("user_id",members.map(m=>m.id)) : null;
  const evidence = new Map((evidenceResult?.data || []).map(row=>[row.user_id,row]));
  const countryNames = new Intl.DisplayNames(["ko"], { type: "region" });
  const countryLabel = (code: string | null) => { if (!code) return "미등록"; const normalized = code.toUpperCase(); if (!/^[A-Z]{2}$/.test(normalized)) return code; return `${({ KR: "대한민국", HK: "홍콩", MO: "마카오", TW: "대만" } as Record<string,string>)[normalized] || countryNames.of(normalized) || normalized} (${normalized})`; };
  const from = total === 0 ? 0 : (page - 1) * ADMIN_MEMBERS_PAGE_SIZE + 1;
  const to = Math.min(page * ADMIN_MEMBERS_PAGE_SIZE, total);

  if (configured && (!user || !canManageMembers(profile))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 회원</h1>
        <p className="mt-4 text-zinc-600">회원 목록을 보려면 관리자 계정으로 로그인하세요.</p>
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">관리자 · 회원</h1>
          <p className="mt-2 text-sm font-medium text-violet-700">증빙 제출·승인 대기 회원 우선 · 다음은 증빙 제출 회원 · 최근 제출순</p>
          <p className="mt-1 text-sm text-zinc-500">
            회원가입한 아이디와 이메일을 확인합니다. 비밀번호는 표시하지 않습니다.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-rose-600 hover:underline">
          대시보드
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" action="/admin/members" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="아이디, 이메일, 이름, 회사"
          className="min-w-[16rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          검색
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        {available
          ? total === 0
            ? "총 0명"
            : `총 ${total}명 · ${from}–${to}번째 · ${page}/${totalPages}페이지`
          : (error ?? "회원 목록을 불러오지 못했습니다.")}
      </p>

      <MemberApprovalForm key={`${query}:${page}`} canAssignStaff={profile?.role === "admin"} adminId={user?.id ?? "unconfigured"} selectableCount={members.filter((member) => canManageMemberTarget(profile, { role: member.role, staff_scope: member.staffScope })).length}>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">선택</th><th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">휴대폰</th>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">회사</th><th className="px-4 py-3">국가</th>
              <th className="px-4 py-3">역할</th>
              <th className="px-4 py-3">사업자 증빙</th><th className="px-4 py-3">가입일</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={10}>
                  {available ? "가입한 회원이 없습니다." : "profiles 테이블을 조회할 수 없습니다."}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">{canManageMemberTarget(profile, { role: member.role, staff_scope: member.staffScope }) ? <input type="checkbox" data-member-id={member.id} aria-label={`${member.email} 선택`} /> : null}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{member.username ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{member.email || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700">{member.phoneNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{member.fullName ?? "—"}{canManageMemberTarget(profile,{role:member.role,staff_scope:member.staffScope})?<Link href={`/admin/members/${member.id}`} className="mt-1 block text-xs text-violet-700 underline">정보 수정</Link>:null}</td>
                  <td className="px-4 py-3 text-zinc-700">{member.companyName ?? "—"}</td><td className="whitespace-nowrap px-4 py-3 text-zinc-700">{countryLabel(member.countryCode)}</td>
                  <td className="px-4 py-3 text-zinc-700">{memberGradeLabel({role: member.role, staff_scope: member.staffScope, member_grade: member.memberGrade})}<span className="mt-1 block text-xs text-zinc-500">{memberRoleLabel(member.role)}</span></td>
                  <td className="px-4 py-3 text-xs">{evidenceResult?.error ? "확인 오류" : evidence.get(member.id)?.file_path ? <><a href={`/api/account/business-document?user=${member.id}`} target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">증빙 열람 · {evidence.get(member.id)?.business_number}</a></> : "미제출"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {formatMemberJoinedAt(member.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </MemberApprovalForm>

      {available && totalPages > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="회원 목록 페이지">
          {page > 1 ? (
            <Link
              href={buildAdminMembersHref(query, page - 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            >
              ← 이전
            </Link>
          ) : (
            <span className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-300">← 이전</span>
          )}
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) =>
            item === page ? (
              <span
                key={item}
                aria-current="page"
                className="min-w-9 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700"
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={buildAdminMembersHref(query, item)}
                className="min-w-9 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
              >
                {item}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link
              href={buildAdminMembersHref(query, page + 1)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            >
              다음 →
            </Link>
          ) : (
            <span className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-300">다음 →</span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
