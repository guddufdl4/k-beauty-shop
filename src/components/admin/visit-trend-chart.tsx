"use client";

import { useId, useState } from "react";
import type { VisitChartPoint, StorefrontVisitStats } from "@/lib/admin/visits";

type Range = "24h" | "7d" | "30d";
const ranges: { key: Range; label: string }[] = [{ key: "24h", label: "24시간" }, { key: "7d", label: "7일" }, { key: "30d", label: "1개월" }];
const number = (value: number) => value.toLocaleString("ko-KR");

export function VisitTrendChart({ last24Hours, last7Days, last30Days, totals }: {
  last24Hours: VisitChartPoint[]; last7Days: VisitChartPoint[]; last30Days: VisitChartPoint[];
  totals: StorefrontVisitStats["totals"];
}) {
  const [range, setRange] = useState<Range>("24h");
  const [showVisitors, setShowVisitors] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId();
  const points = range === "24h" ? last24Hours : range === "7d" ? last7Days : last30Days;
  const width = 800, height = 280, left = 52, right = 30, top = 20, bottom = 46;
  const innerW = width - left - right, innerH = height - top - bottom;
  const rawMax = Math.max(1, ...points.map(p => Math.max(showVisitors ? p.visitors : 0, showViews ? p.views : 0)));
  const max = Math.ceil(rawMax / 4) * 4;
  const plotted = points.map((p, i) => ({ ...p, x: left + i / Math.max(1, points.length - 1) * innerW, vy: top + innerH * (1 - p.visitors / max), py: top + innerH * (1 - p.views / max) }));
  const active = hover === null ? null : plotted[hover];
  const tickEvery = range === "24h" ? 4 : range === "30d" ? 5 : 1;
  const period = points.length ? `${points[0].key.slice(0, 10)} ~ ${points[points.length - 1].key.slice(0, 10)}` : "기록 없음";
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5">
        <div><h3 className="font-semibold text-zinc-900">방문 추이</h3><p className="mt-1 text-xs text-zinc-500">{period} · 한국시간 기준{range === "30d" ? " · 최근 30일" : ""}</p></div>
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1" aria-label="조회 기간">
          {ranges.map(r => <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => { setRange(r.key); setHover(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${range === r.key ? "bg-violet-600 text-white shadow-sm" : "text-zinc-600 hover:bg-white"}`}>{r.label}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 py-5">
        <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-medium text-blue-700">기간 방문자 · 중복 제외</p><p className="mt-2 text-2xl font-bold text-zinc-900">{number(totals[range].visitors)}<span className="ml-1 text-sm font-normal text-zinc-500">명</span></p></div>
        <div className="rounded-xl bg-violet-50 p-4"><p className="text-xs font-medium text-violet-700">전체 페이지뷰</p><p className="mt-2 text-2xl font-bold text-zinc-900">{number(totals[range].views)}<span className="ml-1 text-sm font-normal text-zinc-500">회</span></p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 text-xs">
        <div className="flex gap-5"><label className="flex items-center gap-2 text-blue-600"><input type="checkbox" checked={showVisitors} onChange={e => setShowVisitors(e.target.checked)} />방문자</label><label className="flex items-center gap-2 text-violet-600"><input type="checkbox" checked={showViews} onChange={e => setShowViews(e.target.checked)} />페이지뷰</label></div>
        <p className="text-zinc-500">{range === "24h" ? "시간별" : "일별"} 기록 · 그래프를 선택해 상세 확인</p>
      </div>
      <div className="relative px-2 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-h-[200px] w-full" role="group" aria-label="방문자와 페이지뷰 추이" onMouseLeave={() => setHover(null)}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.14" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
          {[0, 1, 2, 3, 4].map(t => <g key={t}><line x1={left} x2={width-right} y1={top + innerH*(1-t/4)} y2={top + innerH*(1-t/4)} stroke="#e4e4e7" strokeDasharray="3 4" /><text x={left-10} y={top + innerH*(1-t/4)+4} textAnchor="end" fontSize="11" fill="#71717a">{number(max*t/4)}</text></g>)}
          {showViews && plotted.length > 0 && <polygon points={`${left},${top+innerH} ${plotted.map(p => `${p.x},${p.py}`).join(" ")} ${width-right},${top+innerH}`} fill={`url(#${gradient})`} />}
          {showViews && <polyline points={plotted.map(p => `${p.x},${p.py}`).join(" ")} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />}
          {showVisitors && <polyline points={plotted.map(p => `${p.x},${p.vy}`).join(" ")} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />}
          {plotted.map((p, i) => (i % tickEvery === 0 || i === plotted.length-1) && <text key={p.key} x={p.x} y={height-22} textAnchor="middle" fontSize="11" fill="#71717a">{p.label}</text>)}
          {active && <line x1={active.x} x2={active.x} y1={top} y2={top+innerH} stroke="#a1a1aa" strokeDasharray="4 4" pointerEvents="none" />}
          {plotted.map((p, i) => <rect key={p.key} x={p.x-innerW/Math.max(1,points.length-1)/2} y={top} width={innerW/Math.max(1,points.length-1)} height={innerH} fill="transparent" tabIndex={0} role="button" aria-label={`${p.key}, 방문자 ${p.visitors}명, 페이지뷰 ${p.views}회`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => setHover(i)} onKeyDown={e => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); setHover(i); } }} />)}
        </svg>
        {active && <div className="pointer-events-none absolute right-5 top-4 rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 text-xs shadow-md"><p className="font-semibold">{active.key.replace("T", " ")}{range === "24h" ? "시" : ""}</p><p className="mt-2 text-blue-600">방문자 {number(active.visitors)}명</p><p className="mt-1 text-violet-600">페이지뷰 {number(active.views)}회</p></div>}
      </div>
      <p className="border-t border-zinc-100 px-5 py-3 text-xs leading-relaxed text-zinc-500">방문자는 브라우저 기준으로 집계합니다. 기간 합계는 중복을 제외하므로 일별 방문자 합계와 다를 수 있습니다. 기록이 없는 날짜는 0으로 표시합니다.</p>
    </div>
  );
}
