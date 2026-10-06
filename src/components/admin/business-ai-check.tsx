"use client";
import {useState} from "react";
export function BusinessAiConnectionCheck(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 return <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"><button type="button" disabled={busy} className="rounded-lg border border-violet-200 px-3 py-2 text-sm text-violet-800 disabled:opacity-50" onClick={async()=>{setBusy(true);setMessage("");try{const response=await fetch("/api/admin/business-ai-check",{method:"POST"});const data=await response.json();setMessage(response.ok?"AI 연결 정상 · OpenAI 응답 확인 완료":data.error||"연결 확인 실패");}catch{setMessage("연결 확인 실패. 잠시 후 다시 시도해 주세요.");}finally{setBusy(false);}}}>{busy?"연결 확인 중…":"AI 연결 확인"}</button><p className="mt-2 text-xs text-zinc-500">고객 서류 없이 짧은 테스트 요청을 보냅니다.</p>{message&&<p role="status" className="mt-2 text-sm">{message}</p>}</div>;
}
