"use client";
import { useState } from "react";
import { BusinessRegistryLookup } from "./business-registry-lookup";

type Result = { number: string; status: string; taxType: string; closedAt: string | null; checkedAt: string; source: string };
export function BusinessLookupForm({ configured }: { configured: boolean }) {
  const [country, setCountry] = useState("KR");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  return <div className="mt-6 space-y-5">
    <form className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7" onSubmit={async event => {
      event.preventDefault(); if (busy || country !== "KR") return;
      setBusy(true); setError(""); setResult(null);
      try {
        const response = await fetch("/api/admin/business-lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number }), signal: AbortSignal.timeout(12000) });
        const data = await response.json();
        if (!response.ok) setError(data.error || "조회하지 못했습니다."); else setResult(data);
      } catch { setError("조회하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-semibold">국가<select value={country} disabled={busy} onChange={e => { setCountry(e.target.value); setResult(null); setError(""); }} className="mt-2 block min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3">
        {Object.entries({ KR: "대한민국", MO: "마카오", HK: "홍콩", SG: "싱가포르", JP: "일본", AU: "호주", GB: "영국", OTHER: "기타 국가" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="block text-sm font-semibold">사업자 번호<input value={number} disabled={busy} required maxLength={80} autoComplete="off" inputMode={country === "KR" ? "numeric" : "text"} placeholder={country === "KR" ? "123-45-67890" : "현지 사업자 등록번호"} onChange={e => { setNumber(e.target.value); setResult(null); setError(""); }} className="mt-2 block min-h-12 w-full rounded-xl border border-zinc-200 px-3 text-base" /></label>
      {country === "KR" ? <>
        {!configured && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">사이트 내 국세청 조회는 API 키 설정 후 이용할 수 있습니다. 현재는 아래 홈택스 연결을 이용해 주세요.</p>}
        <button disabled={busy || !configured} className="min-h-12 w-full rounded-xl bg-violet-700 px-5 font-semibold text-white disabled:bg-zinc-200 disabled:text-zinc-500">{busy ? "국세청 조회 중…" : "국세청 등록 상태 조회"}</button>
      </> : <p className="text-sm text-zinc-600">해외 번호는 아래 해당 국가 공식 등록기관에서 조회할 수 있습니다.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {result && <section aria-label="사업자 조회 결과" aria-live="polite" className="space-y-2 rounded-xl bg-violet-50 p-4 text-sm">
        <h2 className="font-bold">{result.status}</h2><p>사업자 번호: {result.number}</p><p>과세 유형: {result.taxType || "정보 없음"}</p>{result.closedAt && <p>폐업일: {result.closedAt}</p>}<p className="text-xs text-zinc-500">{result.source} · {new Date(result.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</p>
      </section>}
    </form>
    <BusinessRegistryLookup key={country} country={country} number={number || null} company={null} />
    <p className="text-sm leading-6 text-zinc-500">등록 상태 조회는 해당 번호의 휴·폐업 상태를 확인합니다. 서류 위조나 다른 회사 번호 도용까지 판정하지 않으므로 회사명·대표자·주소를 서류와 별도로 대조해 주세요.</p>
  </div>;
}
