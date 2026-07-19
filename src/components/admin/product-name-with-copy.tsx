"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  href?: string;
  className?: string;
  linkClassName?: string;
  textClassName?: string;
};

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function ProductNameWithCopy({
  name,
  href,
  className,
  linkClassName,
  textClassName,
}: Props) {
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedTextClass = cn(
    "select-text",
    className ?? linkClassName ?? textClassName,
  );

  const handleCopy = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        await navigator.clipboard.writeText(name);
        setToastVisible(true);

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => {
          setToastVisible(false);
        }, 1500);
      } catch {
        // Clipboard access may be unavailable in some contexts.
      }
    },
    [name],
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <span className="relative inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1">
      {href ? (
        <Link href={href} className={cn(resolvedTextClass, "min-w-0")} title={name}>
          {name}
        </Link>
      ) : (
        <span className={cn(resolvedTextClass, "min-w-0")} title={name}>
          {name}
        </span>
      )}

      <button
        type="button"
        onClick={handleCopy}
        aria-label={"\uC0C1\uD488\uBA85 \uBCF5\uC0AC"}
        className="shrink-0 rounded border border-transparent p-0.5 text-zinc-400 transition-colors hover:border-zinc-200 hover:bg-zinc-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-200"
      >
        <CopyIcon className="h-3.5 w-3.5" />
      </button>

      {toastVisible ? (
        <span
          role="status"
          className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-200 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
        >
          {"\uBCF5\uC0AC\uB428"}
        </span>
      ) : null}
    </span>
  );
}