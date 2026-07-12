"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductImportBatch } from "@/lib/supabase/products";

type ImportResponse = {
  batchId: string;
  rowCount: number;
  importedCount: number;
  failedCount: number;
  categoriesCreated?: number;
  categorizedCount?: number;
  categoryPreview?: Array<{ raw: string; slug?: string; name?: string }>;
  status: "success" | "partial" | "failed" | "processing";
  errors: string[];
};

type Props = {
  batches: ProductImportBatch[];
  activeBatchId: string | null;
};

const MSG_SELECT_FILE = "\uc5d1\uc140 \ud30c\uc77c\uc744 \uba3c\uc800 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.";
const MSG_IMPORT_FAIL = "\uc5d1\uc140 import \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.";
const MSG_IMPORT_DONE = "\uc5d1\uc140 \uc77c\uad04 \ub4f1\ub85d\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.";
const MSG_NETWORK = "\ub124\ud2b8\uc6cc\ud06c \uc624\ub958\ub85c import\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.";
const LABEL_BULK = "\ub300\ub7c9 \ub4f1\ub85d";
const TITLE = "\uc5d1\uc140 \uc77c\uad04 \ub4f1\ub85d";
const DESC =
  "brand-priority-list.xlsx 또는 Hanmi Brand Price list(.xlsx) 업로드 / 시트명=브랜드, SKU(바코드) 기준 자동 등록";
const TEMPLATE = "\uc0d8\ud50c \ud15c\ud50c\ub9bf \ub2e4\uc6b4\ub85c\ub4dc";
const BTN_PENDING = "\ucc98\ub9ac \uc911... (\ub300\uc6a9\ub7c9\uc740 5~10\ubd84, \ucc3d \ub2eb\uc9c0 \ub9c8\uc138\uc694)";
const BTN_UPLOAD = "\uc5c5\ub85c\ub4dc \ud6c4 \ub4f1\ub85d";
const HINT =
  "가격: PRICE/Wholesale = 도매가(개당) · MSRP/Retail = 참고가 · 카테고리: Excel Category/CLASSIFICATION → 없으면 Hanmi 참조(data/hanmi-brand-price-list.xlsx) 바코드 매칭 → 상품명 추론 · import 즉시 active(스토어 노출)";
const FILTER = "\ud604\uc7ac \ud544\ud130:";
const ALL_BATCHES = "\uc804\uccb4 \ubc30\uce58";

export function ExcelImportSection({ batches, activeBatchId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const activeBatch = useMemo(
    () => batches.find((batch) => batch.id === activeBatchId) ?? null,
    [activeBatchId, batches],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(MSG_SELECT_FILE);
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ImportResponse | { error?: string };

      if (!response.ok) {
        setError("error" in data && data.error ? data.error : MSG_IMPORT_FAIL);
        return;
      }

      setResult(data as ImportResponse);
      setMessage(MSG_IMPORT_DONE);
      router.refresh();
    } catch {
      setError(MSG_NETWORK);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="excel-import-section"
      aria-label={TITLE}
      className="space-y-4 rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-white p-6 shadow-md ring-1 ring-rose-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            {LABEL_BULK}
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">{TITLE}</h2>
          <p className="mt-1 text-sm text-zinc-500">{DESC}</p>
        </div>
        <a
          href="/templates/hanmi-import-template.csv"
          className="text-sm font-medium text-rose-600 hover:underline"
        >
          {TEMPLATE}
        </a>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <input
          name="file"
          type="file"
          required
          accept=".xlsx,.xls,.csv"
          className="block w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {pending ? BTN_PENDING : BTN_UPLOAD}
        </button>
      </form>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {"총 "}{result.rowCount}{"행 중 "}{result.importedCount}{"건 처리, "}{result.failedCount}{"건 실패 ("}{result.status}{")"}
          {typeof result.categorizedCount === "number" ? (
            <span>{", 카테고리 매핑 "}{result.categorizedCount}{"건"}</span>
          ) : null}
          {typeof result.categoriesCreated === "number" && result.categoriesCreated > 0 ? (
            <span>{", 카테고리 "}{result.categoriesCreated}{"개 생성"}</span>
          ) : null}
          {result.categoryPreview && result.categoryPreview.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-600">
              카테고리 예시:{" "}
              {result.categoryPreview
                .map((item) => item.name ?? item.slug ?? item.raw)
                .join(" · ")}
            </p>
          ) : null}
          {result.errors.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
              {result.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-zinc-700">
        {HINT}
      </div>

      <div className="text-xs text-zinc-500">
        {FILTER}{" "}
        {activeBatch ? (
          <span>
            {activeBatch.filename} ({activeBatch.id.slice(0, 8)})
          </span>
        ) : (
          <span>{ALL_BATCHES}</span>
        )}
      </div>
    </section>
  );
}
