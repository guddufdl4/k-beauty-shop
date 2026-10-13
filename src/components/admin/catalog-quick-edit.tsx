"use client";

import { useState, type FormEvent } from "react";
import type { ProductWithRelations } from "@/lib/supabase/products";

export function CatalogQuickEdit({ product, onSaved, onCancel }: {
  product: ProductWithRelations;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [barcode, setBarcode] = useState(product.barcode ?? "");
  const [retail, setRetail] = useState(product.compare_at_price && product.compare_at_price > 0 ? String(product.compare_at_price) : "");
  const [supply, setSupply] = useState(product.wholesale_price && product.wholesale_price > 0 ? String(product.wholesale_price) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: product.name, barcode: barcode.trim(), wholesale_price: supply.trim() || "0", compare_at_price: retail.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "저장하지 못했습니다.");
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally { setPending(false); }
  }
  return <form onSubmit={save} aria-label={`${product.product_code ?? product.name} 빠른 수정`} className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
    <p className="text-xs font-semibold text-violet-900">가격·바코드 빠른 수정 · 미등록 값은 비워두세요</p>
    <fieldset disabled={pending} className="grid gap-2 sm:grid-cols-3">
      <label className="text-xs">바코드<input aria-label="빠른 수정 바코드" value={barcode} onChange={event => setBarcode(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 font-mono text-sm" /></label>
      <label className="text-xs">소비자가 (KRW)<input aria-label="빠른 수정 소비자가" type="number" min="0" step="any" value={retail} onChange={event => setRetail(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm" /></label>
      <label className="text-xs">공급가 (KRW)<input aria-label="빠른 수정 공급가" type="number" min="0" step="any" value={supply} onChange={event => setSupply(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm" /></label>
    </fieldset>
    {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    <div className="flex gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? "저장 중…" : "저장"}</button><button type="button" disabled={pending} onClick={onCancel} className="rounded-lg border bg-white px-4 py-2 text-xs">취소</button></div>
  </form>;
}
