"use client";
import { useCallback, useState } from "react";
import { useReportWebVitals } from "next/web-vitals";
type Metric = {name: string; value: number; rating: string};
export default function PerformanceDiagnostics() {
  const [metrics,setMetrics] = useState<Record<string, Metric>>({});
  const [closed,setClosed] = useState(false);
  const report = useCallback((metric: Metric) => setMetrics(current => ({...current, [metric.name]: {name:metric.name, value:metric.value, rating:metric.rating}})),[]);
  useReportWebVitals(report);
  if (closed) return null;
  return <aside className="fixed bottom-24 right-3 z-[100] max-w-[calc(100vw-24px)] rounded-xl border border-zinc-300 bg-white p-4 text-xs text-zinc-900 shadow-sm" aria-label="성능 진단"><div className="flex justify-between gap-5"><strong>현재 기기 성능 진단</strong><button onClick={()=>setClosed(true)} aria-label="성능 진단 닫기">✕</button></div><p className="mt-2 max-w-64 text-zinc-500">이 기기의 현재 방문 측정값입니다. 전체 고객 평균이 아닙니다. 화면을 조작하거나 다른 탭으로 이동하면 지표가 확정됩니다.</p><dl className="mt-3 space-y-1">{["TTFB","FCP","LCP","INP","CLS"].map(name=><div key={name} className="flex justify-between gap-5"><dt>{name}</dt><dd>{metrics[name] ? `${metrics[name].value.toFixed(name === "CLS" ? 3 : 0)}${name === "CLS" ? "" : " ms"} · ${metrics[name].rating}` : "측정 대기"}</dd></div>)}</dl><p className="mt-3 text-zinc-500">개인정보·검색어·측정값을 서버로 보내지 않습니다.</p></aside>;
}
