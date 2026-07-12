"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  buildAdminProductsHref,
  getAdminProductsPaginationItems,
  type AdminProductsFilters,
} from "@/lib/admin/admin-products-url";

type Props = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  filters: AdminProductsFilters;
};

export function AdminProductsPagination({
  currentPage,
  totalPages,
  totalCount,
  filters,
}: Props) {
  const router = useRouter();
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function handlePageJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(pageInput.trim(), 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const targetPage = Math.min(totalPages, Math.max(1, parsed));
    if (targetPage === currentPage) {
      setPageInput(String(targetPage));
      return;
    }

    router.push(buildAdminProductsHref(filters, targetPage));
  }

  return (
    <nav
      aria-label={"\uC0C1\uD488 \uBAA9\uB85D \uD398\uC774\uC9C0"}
      className="flex shrink-0 flex-col items-center gap-2 border-t border-zinc-100 bg-white px-3 py-3"
    >
      <p className="text-xs text-zinc-500">
        {"\uCD1D "}
        {totalCount.toLocaleString("ko-KR")}
        {"\uAC74 \u00B7 \uD398\uC774\uC9C0 "}
        {currentPage}
        {" / "}
        {totalPages}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={buildAdminProductsHref(filters, currentPage - 1)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            aria-label={"\uC774\uC804 \uD398\uC774\uC9C0"}
          >
            {"\u2190 \uC774\uC804"}
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-2.5 py-1 text-xs text-zinc-300">
            {"\u2190 \uC774\uC804"}
          </span>
        )}

        {getAdminProductsPaginationItems(currentPage, totalPages).map((page) =>
          page === currentPage ? (
            <span
              key={page}
              aria-current="page"
              className="min-w-7 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-xs font-semibold text-rose-700"
            >
              {page}
            </span>
          ) : (
            <Link
              key={page}
              href={buildAdminProductsHref(filters, page)}
              className="min-w-7 rounded-lg border border-zinc-200 px-2 py-1 text-center text-xs text-zinc-700 hover:border-rose-200 hover:text-rose-700"
              aria-label={`${page}\uD398\uC774\uC9C0`}
            >
              {page}
            </Link>
          ),
        )}

        {currentPage < totalPages ? (
          <Link
            href={buildAdminProductsHref(filters, currentPage + 1)}
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            aria-label={"\uB2E4\uC74C \uD398\uC774\uC9C0"}
          >
            {"\uB2E4\uC74C \u2192"}
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-2.5 py-1 text-xs text-zinc-300">
            {"\uB2E4\uC74C \u2192"}
          </span>
        )}
      </div>

      <form
        onSubmit={handlePageJump}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <label htmlFor="admin-products-page-jump" className="text-xs text-zinc-600">
          {"\uD398\uC774\uC9C0 \uC774\uB3D9"}
        </label>
        <input
          id="admin-products-page-jump"
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(event) => setPageInput(event.target.value)}
          className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-center text-xs text-zinc-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          aria-label={"\uC774\uB3D9\uD560 \uD398\uC774\uC9C0 \uBC88\uD638"}
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          {"\uC774\uB3D9"}
        </button>
      </form>
    </nav>
  );
}
