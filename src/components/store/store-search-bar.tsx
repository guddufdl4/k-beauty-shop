"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FormEvent, useState } from "react";

type Props = {
  className?: string;
};

export function StoreSearchBar({ className }: Props) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    router.push("/products");
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 px-3 py-2.5 text-base text-zinc-800 placeholder:text-zinc-400 focus:outline-none sm:text-sm"
          aria-label={t("searchPlaceholder")}
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
  );
}