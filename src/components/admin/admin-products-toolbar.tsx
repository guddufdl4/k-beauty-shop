"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  buildAdminProductsHref,
  type AdminProductsFilters,
} from "@/lib/admin/admin-products-url";
import type { Category } from "@/lib/supabase/products";

type Props = {
  filters: AdminProductsFilters;
  categories: Category[];
  totalCount: number;
};

export function AdminProductsToolbar({ filters, categories, totalCount }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q ?? "");
  const [brand, setBrand] = useState(filters.brand ?? "");
  const [category, setCategory] = useState(filters.category ?? "");

  const hasActiveFilters = useMemo(
    () => Boolean(filters.q?.trim() || filters.brand?.trim() || filters.category?.trim()),
    [filters.brand, filters.category, filters.q],
  );

  function navigate(next: AdminProductsFilters) {
    router.push(
      buildAdminProductsHref({
        ...next,
        tab: next.tab ?? filters.tab ?? "list",
      }, 1),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      batchId: filters.batchId,
      q: query.trim() || null,
      brand: brand.trim() || null,
      category: category.trim() || null,
      sort: filters.sort,
      view: filters.view,
    });
  }

  function handleClearSearch() {
    setQuery("");
    navigate({
      batchId: filters.batchId,
      q: null,
      brand: brand.trim() || null,
      category: category.trim() || null,
      sort: filters.sort,
      view: filters.view,
    });
  }

  function handleClearAllFilters() {
    setQuery("");
    setBrand("");
    setCategory("");
    navigate({
      batchId: filters.batchId,
      q: null,
      brand: null,
      category: null,
      sort: filters.sort,
      view: filters.view,
    });
  }

  function handleSortChange(sort: AdminProductsFilters["sort"]) {
    navigate({
      batchId: filters.batchId,
      q: filters.q,
      brand: filters.brand,
      category: filters.category,
      sort,
      view: filters.view,
    });
  }

  function handleViewChange(view: AdminProductsFilters["view"]) {
    navigate({
      batchId: filters.batchId,
      q: filters.q,
      brand: filters.brand,
      category: filters.category,
      sort: filters.sort,
      view,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-zinc-900">
          {filters.view === "deleted" ? "삭제된 상품" : "전체 목록"}
        </p>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="hidden sm:inline">정렬</span>
          <select
            value={filters.sort === "recent" ? "recent" : "created"}
            onChange={(event) =>
              handleSortChange(event.target.value === "recent" ? "recent" : null)
            }
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          >
            <option value="created">등록순</option>
            <option value="recent">최신 수집순</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700">
          {totalCount.toLocaleString("ko-KR")}개 상품 찾음
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => handleViewChange("active")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.view !== "deleted"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              활성
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("deleted")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.view === "deleted"
                  ? "bg-white text-red-700 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              삭제됨
            </button>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-medium text-zinc-500 hover:text-rose-600"
            >
              필터 초기화
            </button>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SKU, 바코드, 상품명, 브랜드 검색"
              aria-label="상품 검색"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 pr-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-rose-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            {query ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="검색어 지우기"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            검색
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">브랜드</span>
            <input
              type="text"
              name="brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="브랜드명"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">카테고리</span>
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
            >
              <option value="">전체 카테고리</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
      </div>
    </div>
  );
}
