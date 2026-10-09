"use client";
import { COUNTRY_REGIONS } from "@/lib/auth/country-regions";
import { useState } from "react";
import { BusinessRegistryLookup } from "./business-registry-lookup";

type Result = { number: string; status: string; taxType: string; closedAt: string | null; checkedAt: string; source: string; companies?: { name: string; number: string; jurisdiction: string; status: string; address: string; retrievedAt: string }[] };
export function BusinessLookupForm({ configured, overseasConfigured }: { configured: boolean; overseasConfigured: boolean }) {
  const [country, setCountry] = useState("KR");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = country === "KR" ? configured : overseasConfigured;
  const [result, setResult] = useState<Result | null>(null);
  return <div className="mt-6 space-y-5">
    <form className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError(""); setResult(null);
      try {
        const response = await fetch("/api/admin/business-lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, country }), signal: AbortSignal.timeout(12000) });
        const data = await response.json();
        if (!response.ok) setError(data.error || "조회하지 못했습니다."); else setResult(data);
      } catch { setError("조회하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-semibold">국가<select value={country} disabled={busy} onChange={e => { setCountry(e.target.value); setResult(null); setError(""); }} className="mt-2 block min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3">
        {COUNTRY_REGIONS.map(({code,name}) => <option key={code} value={code}>{name} ({code})</option>)}
      </select></label>
      <label className="block text-sm font-semibold">사업자 번호<input value={number} disabled={busy} required maxLength={80} autoComplete="off" inputMode={country === "KR" ? "numeric" : "text"} placeholder={country === "KR" ? "123-45-67890" : "현지 사업자 등록번호"} onChange={e => { setNumber(e.target.value); setResult(null); setError(""); }} className="mt-2 block min-h-12 w-full rounded-xl border border-zinc-200 px-3 text-base" /></label>
      {!ready && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{country === "KR" ? "국세청 API" : "해외 등록정보 API"} 연결 준비 중입니다. 현재는 아래 공식 조회처를 이용해 주세요.</p>}
      <button disabled={busy || !ready} className="min-h-12 w-full rounded-xl bg-violet-700 px-5 font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-500">{busy ? "등록정보 조회 중…" : country === "KR" ? "국세청 등록 상태 조회" : "해외 사업자 등록정보 조회"}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {result && <section aria-label="사업자 조회 결과" aria-live="polite" className="space-y-2 rounded-xl bg-violet-50 p-4 text-sm">
        {result.companies ? <><h2 className="font-bold">해외 등록정보 검색 결과 {result.companies.length}건</h2>{!result.companies.length && <p>검색 결과가 없습니다. 미등록·가짜라는 뜻은 아닙니다. 번호 형식 또는 제공기관의 국가·사업자 유형별 수록 범위를 확인해 주세요.</p>}{result.companies.map((c,i) => <article key={i} className="space-y-1 rounded-lg bg-white p-3"><p className="font-semibold">{c.name}</p><p>{c.number} · {c.jurisdiction}</p><p>{c.status || "상태 정보 없음"}</p><p>{c.address || "주소 정보 없음"}</p>{c.retrievedAt && <p className="text-xs">원자료 수집: {c.retrievedAt}</p>}</article>)}</> : <h2 className="font-bold">{result.status}</h2>}<p>사업자 번호: {result.number}</p>{!result.companies && <p>과세 유형: {result.taxType || "정보 없음"}</p>}{result.closedAt && <p>폐업일: {result.closedAt}</p>}<p className="text-xs text-zinc-500">{result.source} · {new Date(result.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</p>
      </section>}
    </form>
    <BusinessRegistryLookup key={country} country={country} number={number || null} company={null} />
    <p className="text-sm leading-6 text-zinc-500">국내는 국세청 상태조회, 해외는 제공기관이 수록한 등록정보 검색입니다. 국가별로 지원 범위와 갱신 시점이 다릅니다. 서류 위조나 다른 회사 번호 도용까지 판정하지 않으므로 회사명·대표자·주소를 서류와 별도로 대조해 주세요.</p>
  </div>;
}
