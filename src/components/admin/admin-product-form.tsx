"use client";

import { useActionState } from "react";
import type { ProductFormState } from "@/app/actions/products";
import type { Category } from "@/lib/supabase/products";

type Props = {
  action: (
    prev: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  categories: Category[];
  embedded?: boolean;
};

export function AdminProductForm({ action, categories, embedded }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
      }
    >
      <h2 className={`font-semibold text-zinc-900 ${embedded ? "sr-only" : "text-lg"}`}>
        상품 추가
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
            상품명 *
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-zinc-700">
            브랜드 *
          </label>
          <input
            id="brand"
            name="brand"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-zinc-700">
            SKU *
          </label>
          <input
            id="sku"
            name="sku"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-zinc-700">
            Slug (선택)
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="비우면 상품명에서 자동 생성"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-zinc-700">
            카테고리
          </label>
          <select
            id="category_id"
            name="category_id"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">선택 안 함</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-zinc-700">
            소매가 (KRW) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="1"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="wholesale_price"
            className="block text-sm font-medium text-zinc-700"
          >
            도매가 (KRW)
          </label>
          <input
            id="wholesale_price"
            name="wholesale_price"
            type="number"
            min="0"
            step="1"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="moq" className="block text-sm font-medium text-zinc-700">
            박스 MOQ
          </label>
          <input
            id="moq"
            name="moq"
            type="number"
            min="1"
            defaultValue={1}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-zinc-700">
            재고
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            defaultValue={0}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700"
          >
            설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? "등록 중…" : "상품 등록"}
      </button>
    </form>
  );
}
