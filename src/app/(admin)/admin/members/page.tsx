import { MemberListFilters } from "@/components/admin/member-list-filters";
import { hasBusinessApproval } from "@/lib/auth/business-approval";
import { MemberDesktopWorkspace, MemberPanelButton } from "@/components/admin/member-desktop-workspace";
import { BusinessDocumentPreview } from "@/components/admin/business-document-preview";
import { createServiceClient } from "@/lib/supabase/service";
import { canManageMembers, canManageMemberTarget, memberGradeLabel } from "@/lib/auth/member-access";
import { MemberApprovalForm } from "./member-approval-form";
import Link from "next/link";
import {
  ADMIN_MEMBERS_PAGE_SIZE,
  isRecentMember,
  type NewMemberOptions,
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
  searchParams: Promise<{ q?: string; page?: string | string[]; evidence?: string; view?: string; days?: string; sort?: string }>;
};

export default async function AdminMembersPage({ searchParams }: AdminMembersPageProps) {
  const { configured, user, profile } = await getSessionProfile();
  const params = await searchParams;
  const query = String(params.q ?? "").trim();
  const evidenceFilter = params.evidence === "submitted" || params.evidence === "missing" ? params.evidence : "all";
  const isNew = params.view === "new";
  const days = params.days === "1" ? 1 : params.days === "30" ? 30 : 7;
  const options: NewMemberOptions = {view:isNew ? "new" : "all",days,sort:isNew || params.sort === "latest" ? "latest" : "priority"};
  const now = new Date();
  const requestedPage = parseAdminMembersPage(params.page);
  const { members, total, page, totalPages, available, error, evidenceCounts, newCounts } = await listAdminMembers(
    query,
    requestedPage,
    evidenceFilter,
    {...options,now},
  );
  const service = createServiceClient();
  const evidenceResult = service && members.length && canManageMembers(profile) ? await service.from("business_documents").select("user_id,file_path,file_name,business_number,submitted_at").in("user_id",members.map(m=>m.id)) : null;
  const evidence = new Map((evidenceResult?.data || []).map(row=>[row.user_id,row]));
  const countryNames = new Intl.DisplayNames(["ko"], { type: "region" });
  const priceStatus = (member: (typeof members)[number]) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${hasBusinessApproval(member) ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{hasBusinessApproval(member) ? "가격 공개" : "가격 비공개"}</span>;
  const countryLabel = (code: string | null) => { if (!code) return "미등록"; const normalized = code.toUpperCase(); if (!/^[A-Z]{2}$/.test(normalized)) return code; return `${({ KR: "대한민국", HK: "홍콩", MO: "마카오", TW: "대만" } as Record<string,string>)[normalized] || countryNames.of(normalized) || normalized} (${normalized})`; };
  const renderMemberDetails = (member: (typeof members)[number]) => {
    const name = member.fullName || member.username || member.email;
    const document = evidence.get(member.id);
    return <>
                <div><h3 className="break-words text-xl font-bold">{name}</h3><p className="mt-1 text-sm text-zinc-600">{member.companyName || '회사 미등록'}</p><p className="mt-2 break-all text-sm text-zinc-500">{member.email}</p></div>
                <dl className="space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">{([['국가',countryLabel(member.countryCode)],['사업자 번호',member.businessNumber || document?.business_number || '-'],['등급',memberGradeLabel({role:member.role,staff_scope:member.staffScope,member_grade:member.memberGrade})],['사업자 승인',memberRoleLabel(member.role)],['가입일',formatMemberJoinedAt(member.createdAt)]] as const).map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt className="shrink-0 text-zinc-500">{label}</dt><dd className="break-words text-right font-medium">{value}</dd></div>)}</dl>
                <div className="flex flex-wrap gap-2">{priceStatus(member)}{document?.file_path && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">증빙 제출 완료</span>}</div>
                <section><h4 className="mb-3 font-semibold">사업자 증빙 서류</h4>{document?.file_path ? <><BusinessDocumentPreview userId={member.id} fileName={document.file_name || 'business-document'} /><p className="mt-3 text-xs text-zinc-500">제출: {formatMemberJoinedAt(document.submitted_at || null)}</p><a href={`/api/account/business-document?user=${member.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-violet-700 underline">원본 다운로드</a></> : <p className="text-sm text-zinc-500">증빙 미제출</p>}</section>
                <button name="single_approve" value={member.id} disabled={member.role === 'wholesale'} className="min-h-12 w-full rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white disabled:bg-emerald-50 disabled:text-emerald-700">{member.role === 'wholesale' ? '승인 완료' : '이 회원 승인'}</button>
                <Link href={`/admin/members/${member.id}`} prefetch={false} className="flex min-h-12 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700">회원 정보 수정</Link>
              </>;
  };
  const from = total === 0 ? 0 : (page - 1) * ADMIN_MEMBERS_PAGE_SIZE + 1;
  const to = Math.min(page * ADMIN_MEMBERS_PAGE_SIZE, total);

  if (configured && (!user || !canManageMembers(profile))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">회원 관리</h1>
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
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 pb-56 md:py-10 md:pb-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{isNew ? "신규 가입자" : "회원 관리"}</h1>
          <p className="mt-2 text-sm font-medium text-violet-700">{isNew ? "새로 가입한 회원과 사업자 증빙을 한눈에 확인하세요." : "증빙 제출 우선 · 신규 가입자는 별도 탭에서 확인하세요."}</p>
          <p className="mt-1 hidden text-sm text-zinc-500 md:block">
            회원가입한 아이디와 이메일을 확인합니다. 비밀번호는 표시하지 않습니다.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-rose-600 hover:underline">
          대시보드
        </Link>
      </div>

      <MemberListFilters key={`${query}:${evidenceFilter}:${isNew}:${days}:${options.sort}`} query={query} evidence={evidenceFilter} options={options} counts={evidenceCounts} newCounts={newCounts} />
      <p className="mt-4 text-sm text-zinc-500">{available ? `총 ${total}명 · ${from}–${to}번째 · ${page}/${totalPages}페이지` : error}</p>
      <MemberApprovalForm key={`${query}:${page}:${evidenceFilter}:${isNew}:${days}:${options.sort}`} canAssignStaff={profile?.role === "admin"} adminId={user?.id ?? "unconfigured"} selectableCount={members.filter((member) => canManageMemberTarget(profile, { role: member.role, staff_scope: member.staffScope })).length}>
      <div className="space-y-3 md:hidden" aria-label="모바일 회원 목록">
        {members.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">{available ? "해당하는 회원이 없습니다." : "회원 목록을 불러오지 못했습니다."}</p> : members.map(member => {
          const manageable = canManageMemberTarget(profile, { role: member.role, staff_scope: member.staffScope });
          const document = evidence.get(member.id);
          return <article key={member.id} className="rounded-2xl border border-zinc-200 bg-white p-4 has-[input:checked]:border-violet-500 has-[input:checked]:bg-violet-50/50">
            <div className="flex items-start gap-3">
              {manageable ? <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-50"><input type="checkbox" data-member-id={member.id} aria-label={`${member.email} 모바일 선택`} className="h-6 w-6 accent-violet-700" /></label> : null}
              <div className="min-w-0 flex-1"><h2 className="break-words text-base font-bold text-zinc-900">{member.fullName || member.username || member.email}{isRecentMember(member.createdAt,7,now) && <span className="ml-2 inline-flex rounded-md bg-pink-50 px-2 py-1 align-middle text-[10px] font-bold text-pink-600">NEW</span>}</h2><p className="mt-1 break-words text-sm text-zinc-600">{member.companyName || '회사 미등록'}</p><p className="mt-1 text-xs text-zinc-500">{countryLabel(member.countryCode)} <span className="mx-1">·</span> {formatMemberJoinedAt(member.createdAt)}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold ${evidenceResult?.error ? 'bg-red-50 text-red-700' : document?.file_path ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>{evidenceResult?.error ? '확인 오류' : document?.file_path ? '증빙 제출' : '미제출'}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md bg-zinc-100 px-2 py-1 font-medium text-zinc-700">{memberGradeLabel({role:member.role,staff_scope:member.staffScope,member_grade:member.memberGrade})}</span><span className={member.role === 'wholesale' ? 'text-emerald-700' : 'text-zinc-500'}>{memberRoleLabel(member.role)}</span>{priceStatus(member)}</div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              {manageable && document?.file_path ? <BusinessDocumentPreview userId={member.id} fileName={document.file_name || 'business-document'} compact /> : <span className="text-xs text-zinc-400">{formatMemberJoinedAt(member.createdAt)}</span>}
              {manageable ? <Link href={`/admin/members/${member.id}`} prefetch={false} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-violet-700">회원 상세 · 수정 →</Link> : null}
            </div>
          </article>;
        })}
      </div>
      <MemberDesktopWorkspace panels={members.filter(member=>canManageMemberTarget(profile,{role:member.role,staff_scope:member.staffScope})).map(member=>({id:member.id,content:renderMemberDetails(member)}))}>
      <div className="max-h-[620px] overflow-auto rounded-2xl border border-zinc-200 bg-white" aria-label="PC 회원 목록">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500"><tr><th className="w-14 px-4 py-4">선택</th><th className="px-4 py-4">회원 / 회사</th><th className="px-3 py-4">국가</th><th className="px-3 py-4">회원 등급</th><th className="px-3 py-4">사업자 증빙</th><th className="px-3 py-4">가입일</th><th className="px-3 py-4">가격 열람</th><th className="px-3 py-4">관리</th></tr></thead>
          <tbody>{members.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">{available ? '해당하는 회원이 없습니다.' : '회원 목록을 불러오지 못했습니다.'}</td></tr> : members.map(member => {
            const manageable = canManageMemberTarget(profile,{role:member.role,staff_scope:member.staffScope});
            const document = evidence.get(member.id);
            const name = member.fullName || member.username || member.email;
            return <tr key={member.id} className="border-t border-zinc-100 has-[input:checked]:bg-violet-50/60">
              <td className="px-4 py-4">{manageable ? <input type="checkbox" data-member-id={member.id} aria-label={`${member.email} 선택`} className="h-5 w-5 accent-violet-700" /> : null}</td>
              <td className="max-w-64 px-4 py-4"><p className="break-words font-semibold text-zinc-900">{name}{isRecentMember(member.createdAt,7,now) && <span className="ml-2 inline-flex rounded-md bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-600">NEW</span>}</p><p className="mt-1 break-words text-xs text-zinc-600">{member.companyName || '회사 미등록'}</p><p className="mt-1 break-all text-xs text-zinc-400">{member.email}</p></td>
              <td className="px-3 py-4 text-xs text-zinc-600">{countryLabel(member.countryCode)}</td>
              <td className="px-3 py-4"><span className="inline-flex whitespace-nowrap rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{memberGradeLabel({role:member.role,staff_scope:member.staffScope,member_grade:member.memberGrade})}</span><p className="mt-1 text-xs text-zinc-500">{memberRoleLabel(member.role)}</p></td>
              <td className="px-3 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${evidenceResult?.error ? 'bg-red-50 text-red-700' : document?.file_path ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>{evidenceResult?.error ? '확인 오류' : document?.file_path ? '제출 완료' : '미제출'}</span>{manageable && document?.file_path ? <div className="mt-2"><BusinessDocumentPreview userId={member.id} fileName={document.file_name || 'business-document'} compact /></div> : null}</td>
              <td className="px-3 py-4 text-xs text-zinc-500">{formatMemberJoinedAt(member.createdAt)}</td><td className="px-3 py-4">{priceStatus(member)}</td>
              <td className="px-3 py-4">{manageable ? <MemberPanelButton memberId={member.id} name={name} /> : <span className="text-xs text-zinc-400">권한 없음</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      </MemberDesktopWorkspace>
      </MemberApprovalForm>

      {available && totalPages > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="회원 목록 페이지">
          {page > 1 ? (
            <Link
              prefetch={false}
              href={buildAdminMembersHref(query, page - 1, evidenceFilter, options)}
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
                prefetch={false}
              href={buildAdminMembersHref(query, item, evidenceFilter, options)}
                className="min-w-9 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
              >
                {item}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link
              prefetch={false}
              href={buildAdminMembersHref(query, page + 1, evidenceFilter, options)}
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
