"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ProductImageBatchResult,
  ProductImageBatchStats,
} from "@/lib/admin/product-image-batch";

type BatchApiResponse = {
  result: ProductImageBatchResult;
  stats: ProductImageBatchStats;
};

type Props = {
  initialStats: ProductImageBatchStats | null;
  compact?: boolean;
  variant?: "default" | "management";
};

const SOURCE_LABELS: Record<string, string> = {
  source_row: "Excel/source_row URL",
  category_image: "\uCE74\uD14C\uACE0\uB9AC \uB300\uD45C \uC774\uBBF8\uC9C0",
  category_placeholder: "\uCE74\uD14C\uACE0\uB9AC \uD50C\uB808\uC774\uC2A4\uD640\uB354",
};

export function ProductImageBatchSection({
  initialStats,
  compact,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<ProductImageBatchStats | null>(initialStats);
  const [lastResult, setLastResult] = useState<ProductImageBatchResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunBatch(limit = 1000) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/products/images/batch?limit=${limit}`,
        { method: "POST" },
      );
      const data = (await response.json()) as
        | BatchApiResponse
        | { error?: string };

      if (!response.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : "\uC774\uBBF8\uC9C0 \uBC30\uCE58 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
        );
        return;
      }

      const payload = data as BatchApiResponse;
      setStats(payload.stats);
      setLastResult(payload.result);
      router.refresh();
    } catch {
      setError("\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uB85C \uBC30\uCE58\uB97C \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setPending(false);
    }
  }

  const withoutImage = stats?.withoutImage ?? 0;
  const estimatedBatches = stats?.estimatedBatches ?? 0;
  const batchSize = stats?.defaultBatchSize ?? 1000;
  const hasPreviousRun = Boolean(
    lastResult?.batch_number ?? stats?.lastRun?.batch_number,
  );

  const isManagement = variant === "management";
  const totalProducts = stats?.totalProducts ?? 0;
  const withImage = stats?.withImage ?? 0;
  const coveragePct =
    totalProducts > 0 ? Math.round((withImage / totalProducts) * 100) : 0;

  const primaryLabel =
    pending
      ? "\uCC98\uB9AC \uC911..."
      : withoutImage === 0
        ? "\uBAA8\uB978 \uC0C1\uD488\uC5D0 \uC774\uBBF8\uC9C0 \uC788\uC74C"
        : compact && hasPreviousRun
          ? `\uB2E4\uC74C ${batchSize.toLocaleString("ko-KR")}\uAC1C \uCC98\uB9AC`
          : isManagement
            ? "\uC2E4\uD589"
            : `\uC774\uBBF8\uC9C0 ${batchSize.toLocaleString("ko-KR")}\uAC1C \uCC44\uC6B0\uAE30`;

  if (isManagement) {
    return (
      <section
        aria-label="상품 이미지/정보 관리"
        className="rounded-2xl border border-violet-100 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-50 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">
              이미지 배치
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-zinc-900">
              상품 이미지/정보 관리
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Excel URL · 카테고리 이미지 · 플레이스홀더 순으로 자동 채움
            </p>
          </div>
          <Link
            href="/admin/products/images"
            className="text-xs text-violet-600 hover:underline"
          >
            상세 →
          </Link>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">이미지 커버리지</span>
              <span className="font-medium text-violet-700">
                {withImage.toLocaleString("ko-KR")} / {totalProducts.toLocaleString("ko-KR")} ({coveragePct}%)
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
              <p className="text-[11px] text-violet-700">미등록 이미지</p>
              <p className="text-xl font-bold text-violet-900">
                {withoutImage.toLocaleString("ko-KR")}
              </p>
            </div>
            <button
              type="button"
              disabled={pending || withoutImage === 0}
              onClick={() => handleRunBatch(batchSize)}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryLabel}
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {lastResult ? (
            <p className="text-xs text-zinc-500">
              배치 #{lastResult.batch_number} · 처리 {lastResult.processed_count.toLocaleString("ko-KR")} ·
              남음 {lastResult.remaining_count.toLocaleString("ko-KR")}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500">
            \uC774\uBBF8\uC9C0 \uBC30\uCE58
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            {`\uC0C1\uD488 \uC774\uBBF8\uC9C0 ${batchSize.toLocaleString("ko-KR")}\uAC1C\uC529 \uCC44\uC6B0\uAE30`}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Excel source_row URL, category image, then category placeholder.
          </p>
        </div>
        {!compact ? (
          <Link
            href="/admin/products/images"
            className="text-sm text-violet-600 hover:underline"
          >
            Details
          </Link>
        ) : null}
      </div>

      <dl
        className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}
      >
        <div className="rounded-xl bg-violet-50 px-4 py-3">
          <dt className="text-xs text-violet-700">Missing images</dt>
          <dd className="text-xl font-bold text-violet-900">
            {withoutImage.toLocaleString("ko-KR")}
          </dd>
        </div>
        <div className="rounded-xl bg-zinc-50 px-4 py-3">
          <dt className="text-xs text-zinc-500">
            {`Estimated batches (${batchSize.toLocaleString("ko-KR")})`}
          </dt>
          <dd className="text-xl font-bold text-zinc-900">
            {estimatedBatches.toLocaleString("ko-KR")}
          </dd>
        </div>
        <div className="rounded-xl bg-zinc-50 px-4 py-3">
          <dt className="text-xs text-zinc-500">Last batch</dt>
          <dd className="text-xl font-bold text-zinc-900">
            {lastResult?.batch_number ?? stats?.lastRun?.batch_number ?? "-"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || withoutImage === 0}
          onClick={() => handleRunBatch(batchSize)}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {lastResult ? (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">
            Batch #{lastResult.batch_number}
          </p>
          <p className="mt-1">
            processed {lastResult.processed_count.toLocaleString("ko-KR")} /
            source_row {lastResult.from_source_row} /
            category {lastResult.from_category_image} /
            placeholder {lastResult.from_placeholder} /
            remaining {lastResult.remaining_count.toLocaleString("ko-KR")}
          </p>
          {lastResult.sample.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              {lastResult.sample.map((item) => (
                <li key={item.sku}>
                  {item.sku} - {SOURCE_LABELS[item.source] ?? item.source}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
