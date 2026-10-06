"use client";
import { useActionState } from "react";
import { deleteAdminOrderAction, restoreAdminOrderAction } from "@/app/actions/orders";

type ActionState = { error?: string; success?: string };
export function AdminOrderActionButton({ orderNumber, restore = false }: { orderNumber: string; restore?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (_previous, data) => {
    try { return await (restore ? restoreAdminOrderAction(data) : deleteAdminOrderAction(data)); }
    catch { return { error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }; }
  }, {});
  return <form action={action} onSubmit={(event) => {
    if (!restore && !window.confirm(`주문 ${orderNumber}을 삭제할까요? 삭제된 주문에서 복원할 수 있습니다.`)) event.preventDefault();
  }}>
    <input type="hidden" name="order_number" value={orderNumber} />
    <button type="submit" disabled={pending} className={"whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 " + (restore ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-700 hover:bg-rose-50")}>
      {pending ? "처리 중…" : restore ? "복원" : "삭제"}
    </button>
    {state.error ? <p role="alert" className="mt-2 w-48 whitespace-normal text-xs text-red-700">{state.error}</p> : null}
    {state.success ? <p role="status" className="mt-2 text-xs text-emerald-700">{state.success}</p> : null}
  </form>;
}
