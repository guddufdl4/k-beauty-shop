"use client";
import { useActionState } from "react";
import { changeInquiryTrash } from "@/app/actions/inquiry-trash";
export function InquiryTrashButton({id,type,deleted}: {id:string;type:string;deleted:boolean}) {
 const [state,action,pending] = useActionState<{error?:string;success?:string},FormData>(async(_,form)=>{
  try { return await changeInquiryTrash(form); } catch { return {error:"변경하지 못했습니다. 다시 시도해 주세요."}; }
 },{});
 return <form action={action} onSubmit={event=>{if(!deleted && !window.confirm("이 문의를 삭제 보관함으로 이동할까요? 보관함에서 복원할 수 있습니다.")) event.preventDefault();}} className="mt-4 flex flex-wrap items-center gap-3">
 <input type="hidden" name="id" value={id}/><input type="hidden" name="type" value={type}/><input type="hidden" name="decision" value={deleted?"restore":"delete"}/>
 <button disabled={pending} className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-40">{pending?"처리 중…":deleted?"복원":"삭제"}</button>
 {state.error?<p role="alert" className="text-sm text-red-700">{state.error}</p>:null}{state.success?<p role="status" className="text-sm text-emerald-700">{state.success}</p>:null}</form>;
}
