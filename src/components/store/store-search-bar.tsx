"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { buildProductsHref } from "@/lib/store/products-url";

type SearchSuggestionProduct = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  sku: string;
};

type SearchSuggestions = {
  products: SearchSuggestionProduct[];
  brands: string[];
};

type Props = {
  className?: string;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function StoreSearchBar({ className }: Props) {
  const t = useTranslations("nav");
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    products: [],
    brands: [],
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatItems = [
    ...suggestions.products.map((product) => ({
      type: "product" as const,
      key: `product-${product.id}`,
      label: product.name,
      sublabel: product.brand,
      href: `/products/${product.slug}`,
    })),
    ...suggestions.brands.map((brand) => ({
      type: "brand" as const,
      key: `brand-${brand}`,
      label: brand,
      sublabel: undefined,
      href: buildProductsHref({ q: brand }),
    })),
  ];

  const showDropdown =
    open && query.trim().length >= MIN_QUERY_LENGTH && (loading || flatItems.length > 0);

  const fetchSuggestions = useCallback(async (value: string, signal: AbortSignal) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions({ products: [], brands: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(trimmed)}`,
        { signal },
      );
      if (!response.ok) {
        setSuggestions({ products: [], brands: [] });
        return;
      }
      const data = (await response.json()) as SearchSuggestions;
      setSuggestions(data);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setSuggestions({ products: [], brands: [] });
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions({ products: [], brands: [] });
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchSuggestions(trimmed, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function navigateToSearch(value: string) {
    const trimmed = value.trim();
    setOpen(false);
    setActiveIndex(-1);
    if (trimmed) {
      router.push(buildProductsHref({ q: trimmed }));
      return;
    }
    router.push("/products");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeIndex >= 0 && flatItems[activeIndex]) {
      router.push(flatItems[activeIndex].href);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    navigateToSearch(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, flatItems.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && flatItems[activeIndex]) {
      event.preventDefault();
      router.push(flatItems[activeIndex].href);
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={handleSubmit} role="search">
        <div className="flex overflow-hidden rounded-sm border border-zinc-200 bg-white focus-within:border-rose-200 focus-within:ring-2 focus-within:ring-rose-100">
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 px-3 py-2.5 text-base text-zinc-800 placeholder:text-zinc-400 focus:outline-none sm:text-sm"
            aria-label={t("searchPlaceholder")}
            aria-autocomplete="list"
            aria-controls={showDropdown ? listboxId : undefined}
            aria-expanded={showDropdown}
            autoComplete="off"
          />
          <button
            type="submit"
            className="flex h-11 min-w-11 shrink-0 items-center justify-center bg-accent px-4 text-white transition-colors hover:bg-accent-hover"
            aria-label={t("searchButton")}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </form>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-zinc-500">{t("searchSuggestionsLoading")}</p>
          ) : flatItems.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">{t("searchNoSuggestions")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {suggestions.products.length > 0 ? (
                <li className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("searchSuggestionProducts")}
                </li>
              ) : null}
              {suggestions.products.map((product, index) => {
                const itemIndex = index;
                const isActive = activeIndex === itemIndex;
                return (
                  <li key={`product-${product.id}`} role="presentation">
                    <Link
                      href={`/products/${product.slug}`}
                      role="option"
                      aria-selected={isActive}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        isActive ? "bg-rose-50 text-rose-800" : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => {
                        setOpen(false);
                        setActiveIndex(-1);
                      }}
                    >
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {product.brand}
                        {product.sku ? ` · ${product.sku}` : null}
                      </span>
                    </Link>
                  </li>
                );
              })}

              {suggestions.brands.length > 0 ? (
                <li className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("searchSuggestionBrands")}
                </li>
              ) : null}
              {suggestions.brands.map((brand, index) => {
                const itemIndex = suggestions.products.length + index;
                const isActive = activeIndex === itemIndex;
                return (
                  <li key={`brand-${brand}`} role="presentation">
                    <Link
                      href={buildProductsHref({ q: brand })}
                      role="option"
                      aria-selected={isActive}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        isActive ? "bg-rose-50 text-rose-800" : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => {
                        setOpen(false);
                        setActiveIndex(-1);
                      }}
                    >
                      <span className="block truncate font-medium">{brand}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
