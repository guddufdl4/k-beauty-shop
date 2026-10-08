import Link from "next/link";
import { buildAdminMembersHref, type NewMemberOptions } from "@/lib/admin/members";

type Props = {
  query: string; evidence: string; options: NewMemberOptions;
  counts: { all: number; submitted: number; missing: number; pending: number; vip: number };
  newCounts: { today: number; week: number; month: number };
};
export function MemberListFilters({ query, evidence, options, counts, newCounts }: Props) {
  const isNew = options.view === "new";
  const days = options.days ?? 7;
  const period = days === 1 ? "오늘" : `최근 ${days}일`;
  const cards = isNew
    ? [["오늘 가입", newCounts.today, "violet"], ["최근 7일 가입", newCounts.week, "violet"], [`증빙 제출 · ${period}`, counts.submitted, "emerald"], [`증빙 미제출 · ${period}`, counts.missing, "amber"]] as const
    : [["전체 회원", counts.all, "violet"], ["증빙 제출", counts.submitted, "emerald"], ["승인 대기", counts.pending, "amber"], ["VIP", counts.vip, "violet"]] as const;
  const pill = (active: boolean) => `flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-violet-700 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-violet-50"}`;
  return <>
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="회원 가입 현황">
      {cards.map(([label, count, color]) => <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
        <p className="text-xs text-zinc-500 md:text-sm">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${color === "emerald" ? "text-emerald-700" : color === "amber" ? "text-amber-700" : "text-zinc-900"}`}>{count}<span className="ml-1 text-sm font-normal text-zinc-400">명</span></p>
      </div>)}
    </div>
    <nav className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="회원 목록 구분">
      <Link prefetch={false} href={buildAdminMembersHref(query,1)} aria-current={!isNew && evidence === "all" ? "page" : undefined} className={pill(!isNew && evidence === "all")}>전체 회원</Link>
      <Link prefetch={false} href={buildAdminMembersHref(query,1,"all",{view:"new",days,sort:"latest"})} aria-current={isNew && evidence === "all" ? "page" : undefined} className={pill(isNew && evidence === "all")}>신규 가입자 <span className="text-xs opacity-80">{isNew ? counts.all : newCounts.week}</span></Link>
      {([['submitted','증빙 제출'],['missing','미제출']] as const).map(([value,label])=><Link key={value} prefetch={false} href={buildAdminMembersHref(query,1,value,options)} aria-current={evidence === value ? "page" : undefined} className={pill(evidence === value)}>{label}<span className="text-xs opacity-80">{counts[value]}</span></Link>)}
    </nav>
    {isNew && <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="신규 가입 기간">
      {([1,7,30] as const).map(value=><Link key={value} prefetch={false} href={buildAdminMembersHref(query,1,evidence,{...options,days:value})} aria-current={days === value ? "page" : undefined} className={pill(days === value)}>{value === 1 ? "오늘" : `${value}일`}</Link>)}
      <span className="ml-1 text-xs text-zinc-500">한국시간 기준 · 오늘 포함</span>
    </nav>}
    <form className="mt-4 flex flex-wrap gap-2" action="/admin/members" method="get">
      <input type="hidden" name="evidence" value={evidence} />
      {isNew && <><input type="hidden" name="view" value="new"/><input type="hidden" name="days" value={days}/></>}
      <input type="search" name="q" defaultValue={query} placeholder="이름, 이메일, 회사 검색" aria-label="회원 검색" className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm"/>
      <select name="sort" aria-label="회원 정렬" defaultValue={isNew ? "latest" : options.sort ?? "priority"} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm">
        {!isNew && <option value="priority">증빙 제출 우선</option>}
        <option value="latest">가입일 최신순</option>
      </select>
      <button className="min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white">검색</button>
    </form>
  </>;
}
