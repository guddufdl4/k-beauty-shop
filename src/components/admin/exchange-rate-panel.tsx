"use client";
import { useState } from "react";
import type { ExchangeRateState } from "@/lib/exchange-rate-policy";

function time(value: string | null) { return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " KST" : "아직 확인하지 않음"; }
export function ExchangeRatePanel({ initial }: { initial: ExchangeRateState | null }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/exchange-rate", { method: "POST" });
      const result = await response.json();
      if (typeof result.appliedRate === "number") setState(result);
      if (!response.ok) throw new Error(result.error || "환율을 확인하지 못했습니다.");
      setMessage("환율을 확인하고 전체 상품의 달러 환산 기준에 적용했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "환율 확인 실패"); }
    finally { setBusy(false); }
  }
  return <section className="my-8 rounded-2xl border border-violet-100 bg-white p-5 sm:p-6" aria-labelledby="exchange-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-violet-600">USD / KRW · 매일 자동 확인</p><h2 id="exchange-heading" className="mt-1 text-xl font-bold">상품 적용 환율</h2></div><button type="button" disabled={busy} onClick={refresh} className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "확인 중…" : "지금 환율 확인"}</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-violet-50 p-4"><p className="text-sm text-zinc-500">적용 환율 · 1 USD</p><p className="mt-2 text-2xl font-bold">{state ? state.appliedRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "원" : "확인 필요"}</p></div>
      <div className="rounded-xl bg-zinc-50 p-4"><p className="text-sm text-zinc-500">조회 환율</p><p className="mt-2 text-xl font-semibold">{state?.marketRate ? state.marketRate.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "원" : "—"}</p><p className="mt-1 text-xs text-zinc-500">기준일 {state?.rateDate || "—"}</p></div>
      <div className="rounded-xl bg-zinc-50 p-4"><p className="text-sm text-zinc-500">최저 적용 환율</p><p className="mt-2 text-xl font-semibold">1,350원</p><p className="mt-1 text-xs text-zinc-500">1,350원 미만으로 내려가지 않습니다.</p></div>
    </div>
    <p className="mt-4 text-sm text-zinc-600">매일 오전 9시(한국시간) 확인 · 달러 상품가 = 원화 상품가 ÷ 적용 환율</p>
    <p className="mt-2 text-xs text-zinc-500">마지막 정상 확인: {time(state?.checkedAt || null)}<br/>마지막 시도: {time(state?.attemptedAt || null)}</p>
    <p className="mt-2 text-xs text-zinc-500">휴일에는 최근 발표 환율을 사용합니다. 조회 실패 시 마지막 정상 환율을 유지합니다. 기존 전송 견적·주문 금액은 변경하지 않습니다.</p>
    <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-violet-600 underline">환율 출처: Frankfurter (공식 기관 기준 환율)</a>
    {(state?.error || message) && <p role="status" className="mt-3 text-sm text-zinc-700">{message || state?.error}</p>}
  </section>;
}
