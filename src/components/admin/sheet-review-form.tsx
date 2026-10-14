"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SheetReviewDecision } from "@/lib/admin/sheet-review-decision";

export function SheetReviewForm({id, decision}: {id: string; decision: SheetReviewDecision | null}) {
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState("");
  const router = useRouter();
  return <form className="mt-3 space-y-2 border-t pt-3" onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setMessage("");
    try {const response = await fetch(`/api/admin/catalog-review/${id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({state:form.get("state"), note:form.get("note")})}); const result = await response.json(); if (!response.ok) throw Error(result.error); setMessage("저장했습니다. 상품명·가격·판매 상태는 별도로 수정해야 합니다."); router.refresh();}
    catch(error) {setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");} finally {setPending(false);}
  }}><fieldset disabled={pending} className="flex flex-wrap gap-2"><select aria-label="검토 처리 상태" name="state" defaultValue={decision?.state ?? "pending"} className="min-h-11 rounded-lg border px-3"><option value="pending">미검토</option><option value="verified">원본 일치 확인</option><option value="option-difference">옵션·표기 차이 확인</option><option value="supplier-check">공급사 확인 필요</option><option value="not-carried">미취급 확인</option></select><input aria-label="검토 근거와 메모" name="note" defaultValue={decision?.note ?? ""} maxLength={1000} placeholder="시트·행·바코드 등 확인 근거" className="min-h-11 min-w-0 flex-1 rounded-lg border px-3"/><button className="rounded-lg bg-violet-700 px-4 py-2 text-white">{pending ? "저장 중…" : "검토 저장"}</button></fieldset>{decision ? <p className="text-xs text-zinc-500">최근 처리: {new Date(decision.at).toLocaleString("ko-KR", {timeZone:"Asia/Seoul"})} (KST)</p> : null}{message ? <p role="status" className="text-sm text-violet-700">{message}</p> : null}</form>;
}
