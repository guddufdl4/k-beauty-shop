"use client";

import { deleteAdminOrderAction } from "@/app/actions/orders";

export function AdminOrderDeleteButton({ orderNumber }: { orderNumber: string }) {
  return (
    <form
      action={deleteAdminOrderAction}
      onSubmit={(event) => {
        if (!window.confirm(`주문 ${orderNumber}을(를) 삭제할까요? 나중에 복구할 수 있습니다.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="order_number" value={orderNumber} />
      <button
        type="submit"
        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
      >
        삭제
      </button>
    </form>
  );
}
