"use client";

import { useState } from "react";

type Props = {
  title: string;
  shareLabel: string;
  copiedLabel: string;
};

export function ProductShareButton({ title, shareLabel, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={share}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        aria-label={shareLabel}
      >
        {shareLabel}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
      {copied ? <span className="text-xs text-emerald-700">{copiedLabel}</span> : null}
    </div>
  );
}
