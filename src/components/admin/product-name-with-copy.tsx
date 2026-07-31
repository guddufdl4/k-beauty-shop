"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  brand?: string | null;
  className?: string;
  textClassName?: string;
};

export function formatProductCopyName(name: string, brand?: string | null): string {
  const trimmedBrand = brand?.trim();
  return trimmedBrand ? `${trimmedBrand} ${name}` : name;
}

export function ProductNameWithCopy({
  name,
  brand,
  className,
  textClassName,
}: Props) {
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyText = formatProductCopyName(name, brand);
  const trimmedBrand = brand?.trim();

  const handleCopy = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        await navigator.clipboard.writeText(copyText);
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
    [copyText],
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <span className="relative inline-flex min-w-0 max-w-full">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`${copyText} 복사`}
        title={`${copyText} (클릭하여 복사)`}
        className={cn(
          "min-w-0 cursor-copy truncate text-left transition-colors hover:text-rose-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-200",
          className ?? textClassName,
        )}
      >
        {trimmedBrand ? (
          <>
            <span className="font-normal">{trimmedBrand} </span>
            <span className="font-medium">{name}</span>
          </>
        ) : (
          name
        )}
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
