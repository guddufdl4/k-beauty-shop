"use client";

import { useState } from "react";

const registries: Record<string, { label: string; url: string }> = {
  KR: { label: "국세청 홈택스", url: "https://www.hometax.go.kr/" },
  AU: { label: "호주 ABN Lookup", url: "https://abr.business.gov.au/" },
  GB: { label: "영국 Companies House", url: "https://find-and-update.company-information.service.gov.uk/" },
  JP: { label: "일본 Gビズインフォ", url: "https://info.gbiz.go.jp/hojin/Top" },
};

export function BusinessRegistryLookup({ country, number, company }: { country: string | null; number: string | null; company: string | null }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const registry = registries[(country || "").toUpperCase()];
  return <section className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
    <h4 className="font-semibold">공식 사업자 조회</h4>
    <p className="break-all text-sm">{company || "회사 미등록"} · {number || "사업자 번호 미등록"}</p>
    {number && <button type="button" className="min-h-11 rounded-lg border bg-white px-3 text-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(number); setCopied(true); setError(false); }
      catch { setError(true); }
    }}>{copied ? "번호 복사 완료" : "사업자 번호 복사"}</button>}
    {error && <p role="status" className="text-xs text-red-700">복사하지 못했습니다. 위 번호를 직접 선택해서 복사해 주세요.</p>}
    {registry ? <a href={registry.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-sm font-semibold text-violet-700 underline">{registry.label}에서 조회 ↗</a> : <p className="text-sm text-zinc-600">이 국가의 공식 조회처는 아직 연결되지 않았습니다. 해당 국가 등록기관에서 회사명과 등록번호를 확인해 주세요.</p>}
    <p className="text-xs leading-5 text-zinc-600">{country?.toUpperCase() === "KR" ? "홈택스에서 ‘사업자등록상태 조회’를 검색한 뒤 번호를 입력하세요. " : "공식 등록기관에서 회사명·등록번호·주소·영업 상태를 서류와 대조하세요. "}외부 조회 결과는 자동 저장되지 않으며, 조회 버튼만으로 진위가 확인되는 것은 아닙니다.</p>
  </section>;
}
