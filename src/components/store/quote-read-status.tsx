"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function QuoteReadStatus({ orderNumber, reviewedAt, admin = false }: { orderNumber: string; reviewedAt?: string | null; admin?: boolean }) {
  const t = useTranslations("quoteRead");
  const locale = useLocale();
  const [time, setTime] = useState(reviewedAt);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!admin || reviewedAt) return;
    const controller = new AbortController();
    fetch("/api/admin/quote-read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }), signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Read receipt unavailable");
      const data = await response.json();
      setTime(data.reviewedAt);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [admin, orderNumber, reviewedAt]);
  return <div className="my-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm" role="status">
    <p className="font-semibold">{t("label")}: {failed ? t("failed") : time ? t("read") : t("unread")}</p>
    {time ? <p className="mt-1 text-zinc-600">{new Date(time).toLocaleString(locale, { timeZone: "Asia/Seoul" })} (KST)</p> : null}
    <p className="mt-1 text-xs text-zinc-500">{t("hint")}</p>
  </div>;
}
