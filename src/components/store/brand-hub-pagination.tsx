"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { buildBrandHubHref } from "@/lib/store/brand-url";
import { getProductsPaginationItems } from "@/lib/store/products-url";

type Props = {
  brandSlug: string;
  categorySlug?: string;
  currentPage: number;
  totalPages: number;
};

export function BrandHubPagination({
  brandSlug,
  categorySlug,
  currentPage,
  totalPages,
}: Props) {
  const t = useTranslations("products");
  const router = useRouter();
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const pageInput = pageDraft ?? String(currentPage);

  function buildPageHref(page: number): string {
    return buildBrandHubHref(brandSlug, {
      category: categorySlug,
      page: page > 1 ? page : undefined,
    });
  }

  function handlePageJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = pageInput.trim();
    setPageDraft(null);
    if (!/^\d+$/.test(trimmed)) {
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    const targetPage = Math.min(totalPages, Math.max(1, parsed));
    if (targetPage === currentPage) {
      setPageDraft(String(targetPage));
      return;
    }

    router.push(buildPageHref(targetPage));
  }

  const paginationItems = getProductsPaginationItems(currentPage, totalPages);

  return (
    <nav
      aria-label={t("paginationLabel")}
      className="mt-10 border-t border-zinc-100 pt-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildPageHref(currentPage - 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            aria-label={t("prevPage")}
          >
            {t("prevPage")}
          </Link>
        ) : (
          <span
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-zinc-300"
            aria-hidden="true"
          >
            {t("prevPage")}
          </span>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1">
          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="min-w-7 px-1 text-center text-sm text-zinc-400"
                aria-hidden="true"
              >
                ...
              </span>
            ) : item === currentPage ? (
              <span
                key={item}
                aria-current="page"
                className="min-w-9 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-center text-sm font-semibold text-rose-700"
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={buildPageHref(item)}
                className="min-w-9 rounded-lg border border-zinc-200 px-2.5 py-2 text-center text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
                aria-label={t("pageNumberLabel", { page: item })}
              >
                {item}
              </Link>
            ),
          )}
        </div>

        <form
          onSubmit={handlePageJump}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <label htmlFor="brand-hub-page-jump" className="sr-only">
            {t("pageJumpLabel")}
          </label>
          <input
            id="brand-hub-page-jump"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                setPageDraft(value);
              }
            }}
            className="w-14 rounded-lg border border-zinc-200 px-2 py-2 text-center text-sm text-zinc-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
            aria-label={t("pageJumpInput")}
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-rose-200 hover:text-rose-700"
          >
            {t("pageJumpGo")}
          </button>
        </form>

        {currentPage < totalPages ? (
          <Link
            href={buildPageHref(currentPage + 1)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
            aria-label={t("nextPage")}
          >
            {t("nextPage")}
          </Link>
        ) : (
          <span
            className="rounded-lg border border-transparent px-4 py-2 text-sm text-zinc-300"
            aria-hidden="true"
          >
            {t("nextPage")}
          </span>
        )}
      </div>
    </nav>
  );
}
