import type { OrderFilters } from "@/lib/admin/order-workflow-policy";
import Link from "next/link";
import { buildAdminOrdersHref, type AdminOrderDateRange } from "@/lib/admin/orders";
import { seoulYmd, shiftSeoulYmd } from "@/lib/admin/visits";

export function OrderDateFilters({ range, view, filters = {} }: { range: AdminOrderDateRange; view: "active" | "deleted"; filters?: OrderFilters }) {
  const today = seoulYmd();
  const presets = [
    { label: "전체 기간", range: {} },
    { label: "오늘", range: { start: today, end: today } },
    { label: "최근 7일", range: { start: shiftSeoulYmd(today, -6), end: today } },
    { label: "최근 30일", range: { start: shiftSeoulYmd(today, -29), end: today } },
  ];
  return <section aria-label="주문 날짜 조회" className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
    <nav aria-label="주문 조회 기간" className="flex flex-wrap gap-2">
      {presets.map(preset => {
        const active = range.start === preset.range.start && range.end === preset.range.end;
        return <Link key={preset.label} prefetch={false} href={buildAdminOrdersHref(1, view, preset.range, filters)} aria-current={active ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-violet-700 text-white" : "bg-zinc-100 text-zinc-600"}`}>{preset.label}</Link>;
      })}
    </nav>
    <form action="/admin/orders" method="get" className="mt-4 grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
      {Object.entries(filters).map(([key,value]) => value ? <input key={key} type="hidden" name={key} value={value} /> : null)}
      {view === "deleted" ? <input type="hidden" name="view" value="deleted" /> : null}
      <label className="min-w-0 text-xs text-zinc-500">시작일
        <input aria-label="주문 시작일" name="start" type="date" defaultValue={range.start ?? ""} className="mt-1 block w-full min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900" />
      </label>
      <label className="min-w-0 text-xs text-zinc-500">종료일
        <input aria-label="주문 종료일" name="end" type="date" defaultValue={range.end ?? ""} className="mt-1 block w-full min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900" />
      </label>
      <button type="submit" className="rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white">기간 조회</button>
      <p className="self-center text-xs text-zinc-500">한국시간 · 시작일과 종료일 포함</p>
    </form>
    <p className="mt-3 text-sm text-zinc-600">조회 기간: {range.start ?? "처음"} ~ {range.end ?? "전체"}</p>
    <p className="mt-1 text-xs text-zinc-500">아래 건수·합계와 주문 목록은 선택한 접수 기간을 기준으로 표시합니다.</p>
  </section>;
}
