"use client";

import { useActionState } from "react";
import type { ProductFormState } from "@/app/actions/products";

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
};

export function AddProductForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 max-w-lg space-y-3 rounded-xl border bg-white p-6">
      <h2 className="font-semibold">새 상품 등록</h2>
      {[
        ["name", "상품명", "text"],
        ["slug", "URL slug", "text"],
        ["brand", "브랜드", "text"],
        ["sku", "SKU", "text"],
        ["price", "소매가 (USD)", "number"],
        ["stock", "재고", "number"],
        ["moq", "MOQ", "number"],
      ].map(([name, label, type]) => (
        <div key={name}>
          <label className="text-sm font-medium">{label}</label>
          <input
            name={name}
            type={type}
            required={name !== "stock" && name !== "moq"}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      ))}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "등록 중…" : "등록"}
      </button>
    </form>
  );
}
