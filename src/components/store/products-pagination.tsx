"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  buildProductsHref,
  type ProductListSort,
} from "@/lib/store/products-url";

type ListHrefOptions = {
  category?: string;
  brand?: string;
  q?: string;
  sort?: ProductListSort;
};

type Props = {
  currentPage: number;
  totalPages: number;
  listHrefOptions: ListHrefOptions;
};

export function ProductsPagination({
  currentPage,
  totalPages,
  listHrefOptions,
}: Props) {
  const t = useTranslations("products");
  const router = useRouter();
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function handlePageJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = pageInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    const targetPage = Math.min(totalPages, Math.max(1, parsed));
    if (targetPage === currentPage) {
      setPageInput(String(targetPage));
      return;
    }

    router.push(buildProductsHref({ ...listHrefOptions, page: targetPage }));
  }

  return (
    <nav
      aria-label={t("paginationLabel")}
      className="mt-10 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6"
    >
      {currentPage > 1 ? (
        <Link
          href={buildProductsHref({ ...listHrefOptions, page: currentPage - 1 })}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          {t("prevPage")}
        </Link>
      ) : (
        <span className="text-sm text-zinc-300">{t("prevPage")}</span>
      )}

      <form
        onSubmit={handlePageJump}
        className="flex items-center gap-2 text-sm text-zinc-500"
      >
        <label htmlFor="products-page-jump" className="sr-only">
          {t("pageJumpLabel")}
        </label>
        <input
          id="products-page-jump"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pageInput}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "" || /^\d+$/.test(value)) {
              setPageInput(value);
            }
          }}
          className="w-14 rounded-lg border border-zinc-200 px-2 py-1 text-center text-sm text-zinc-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          aria-label={t("pageJumpInput")}
        />
        <span aria-hidden="true">/ {totalPages}</span>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          {t("pageJumpGo")}
        </button>
      </form>

      {currentPage < totalPages ? (
        <Link
          href={buildProductsHref({ ...listHrefOptions, page: currentPage + 1 })}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          {t("nextPage")}
        </Link>
      ) : (
        <span className="text-sm text-zinc-300">{t("nextPage")}</span>
      )}
    </nav>
  );
}
