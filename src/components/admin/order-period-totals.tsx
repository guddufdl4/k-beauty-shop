"use client";

import { useState } from "react";
import type { AdminOrderPeriodTotals } from "@/lib/admin/orders";
import { formatKRW } from "@/lib/utils";

type PeriodTab = "daily" | "weekly" | "monthly";

const TABS: { id: PeriodTab; label: string }[] = [
  { id: "daily", label: "일간" },
  { id: "weekly", label: "주간" },
  { id: "monthly", label: "월간" },
];

export function AdminOrderPeriodTotals({
  totals,
  view,
}: {
  totals: AdminOrderPeriodTotals;
  view: "active" | "deleted";
}) {
  const [tab, setTab] = useState<PeriodTab>("daily");
  const rows = tab === "daily" ? totals.daily : tab === "weekly" ? totals.weekly : totals.monthly;

  return (
    <section className="mt-6" aria-labelledby="order-period-totals-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="order-period-totals-heading" className="text-lg font-semibold text-zinc-900">
            기간별 합계
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {view === "deleted" ? "삭제된 주문만 · " : ""}
            서울 시간(UTC+9) · 한 주는 월요일부터
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs font-semibold">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-3 py-1.5 ${
                tab === item.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PeriodHighlightCard label="오늘" amount={totals.today.amount} count={totals.today.count} />
        <PeriodHighlightCard label="어제" amount={totals.yesterday.amount} count={totals.yesterday.count} />
        <PeriodHighlightCard label="이번 주" amount={totals.thisWeek.amount} count={totals.thisWeek.count} />
        <PeriodHighlightCard label="저번 주" amount={totals.lastWeek.amount} count={totals.lastWeek.count} />
        <PeriodHighlightCard label="이번 달" amount={totals.thisMonth.amount} count={totals.thisMonth.count} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">기간</th>
              <th className="px-4 py-3">건수</th>
              <th className="px-4 py-3 text-right">합계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.key} className={row.current ? "bg-rose-50/70" : undefined}>
                <td className="px-4 py-3 font-medium text-zinc-900">{row.label}</td>
                <td className="px-4 py-3 text-zinc-600">{row.count}건</td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatKRW(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PeriodHighlightCard({
  label,
  amount,
  count,
}: {
  label: string;
  amount: number;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatKRW(amount)}</p>
      <p className="mt-1 text-xs text-zinc-500">{count}건</p>
    </div>
  );
}
