"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildCategoryTree } from "@/lib/store/category-tree";
import { buildProductsHref } from "@/lib/store/products-url";
import type { Category } from "@/lib/supabase/products";

type Props = {
  categories: Category[];
};

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

const subLinkClass =
  "block rounded-md px-2 py-1.5 text-sm font-medium leading-snug text-zinc-800 transition-colors hover:bg-accent-soft hover:text-accent-hover";

export function CategoryMegaMenu({ categories }: Props) {
  const tNav = useTranslations("nav");
  const tProducts = useTranslations("products");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { columns } = useMemo(() => buildCategoryTree(categories), [categories]);
  const columnCount = Math.min(columns.length, 6);

  const syncPanelTop = useCallback(() => {
    if (!rootRef.current || !panelRef.current) {
      return;
    }
    panelRef.current.style.top = `${rootRef.current.getBoundingClientRect().bottom}px`;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    syncPanelTop();

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("scroll", syncPanelTop, true);
    window.addEventListener("resize", syncPanelTop);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", syncPanelTop, true);
      window.removeEventListener("resize", syncPanelTop);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, syncPanelTop]);

  if (columns.length === 0) {
    return null;
  }

  const panelVisible = open;

  return (
    <div
      ref={rootRef}
      className="group relative flex self-stretch"
      onMouseEnter={() => {
        syncPanelTop();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex items-center gap-2 border-r border-accent-hover/30 px-5 py-3 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${open ? "text-accent-hover" : "text-zinc-900"}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          syncPanelTop();
          setOpen((value) => !value);
        }}
      >
        <HamburgerIcon />
        {tNav("categories")}
      </button>

      <div
        ref={panelRef}
        className={`fixed inset-x-0 z-50 border-t-2 border-accent-hover bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${panelVisible ? "block" : "hidden group-hover:block"}`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-end border-b border-accent-hover/30 py-2.5">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
              aria-label={tNav("closeMenu")}
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
              <span className="hidden sm:inline">{tNav("closeMenu")}</span>
            </button>
          </div>

          <div className="flex w-full items-stretch">
            {columns.slice(0, columnCount).map(({ parent, children }, index) => (
              <div
                key={parent.id}
                className={`min-w-0 flex-1 py-8 px-4 first:pl-0 last:pr-0 sm:px-5 lg:first:pl-0 lg:last:pr-0 ${index < columnCount - 1 ? "border-r-2 border-accent-hover" : ""}`}
              >
                <Link
                  href={buildProductsHref({ category: parent.slug })}
                  className="group/header inline-block border-b-2 border-transparent pb-2 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:border-accent-hover hover:text-accent-hover"
                  onClick={() => setOpen(false)}
                >
                  {parent.name}
                </Link>
                {children.length > 0 ? (
                  <ul
                    className={`mt-3 max-w-[14rem] ${children.length > 6 ? "columns-2 gap-x-3" : ""}`}
                  >
                    {children.map((child) => (
                      <li key={child.id} className="break-inside-avoid">
                        <Link
                          href={buildProductsHref({ category: child.slug })}
                          className={subLinkClass}
                          onClick={() => setOpen(false)}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 max-w-[14rem]">
                    <Link
                      href={buildProductsHref({ category: parent.slug })}
                      className={subLinkClass}
                      onClick={() => setOpen(false)}
                    >
                      {tProducts("allInCategory", { category: parent.name })}
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}