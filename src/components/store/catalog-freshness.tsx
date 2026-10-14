"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Refresh visible catalog pages after returning to an old tab, without polling hidden tabs or resetting forms. */
export function CatalogFreshness() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!/^\/[a-z]{2}(?:\/(?:products|brands)(?:\/[^/]+)?)?\/?$/.test(pathname)) return;
    let refreshedAt = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - refreshedAt < 120_000) return;
      // Preserve any quantity or other unsaved form edits while the customer is working.
      if (document.activeElement?.matches("input, textarea, select")) return;
      refreshedAt = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 300_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);
  return null;
}
