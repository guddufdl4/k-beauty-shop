"use client";

import { restoreAdminOrderAction } from "@/app/actions/orders";

export function AdminOrderRestoreButton({ orderNumber }: { orderNumber: string }) {
  return (
    <form action={restoreAdminOrderAction}>
      <input type="hidden" name="order_number" value={orderNumber} />
      <button
        type="submit"
        className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        복구
      </button>
    </form>
  );
}
