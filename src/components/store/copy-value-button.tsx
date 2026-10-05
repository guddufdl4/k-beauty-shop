"use client";

import { useState } from "react";

type Props = {
  value: string;
  label: string;
  copiedLabel: string;
};

export function CopyValueButton({ value, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        aria-label={label}
      >
        {label}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
      {copied ? <span className="text-xs text-emerald-700">{copiedLabel}</span> : null}
    </span>
  );
}
