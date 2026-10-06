"use client";
import { useActionState } from "react";
import { updateSupportInquiry } from "@/app/actions/support-inquiries";
export function SupportInquiryStatus({ id, viewed, resolved }: { id: string; viewed: boolean; resolved: boolean }) {
  const [state, action, pending] = useActionState<{ error?: string; success?: string }, FormData>(async (_state, form) => {
    try { return await updateSupportInquiry(form); } catch { return { error: "문의 상태를 변경하지 못했습니다." }; }
  }, {});
  return <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
    <input name="id" type="hidden" value={id} />
    {!viewed ? <button name="decision" value="viewed" disabled={pending} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">확인 완료</button> : null}
    <button name="decision" value={resolved ? "reopen" : "resolve"} disabled={pending} className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-40">{pending ? "처리 중…" : resolved ? "처리 중으로 변경" : "처리 완료"}</button>
    {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
    {state.success ? <p role="status" className="text-sm text-emerald-700">{state.success}</p> : null}
  </form>;
}
