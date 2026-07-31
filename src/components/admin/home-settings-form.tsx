"use client";

import { useState } from "react";
import type { HomeSettings } from "@/lib/site-settings";

type Props = {
  initialSettings: HomeSettings;
};

export function AdminHomeSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const raw = String(formData.get("trending_skus") ?? "");
    const trendingSkus = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/admin/home-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trending_skus: trendingSkus }),
      });

      const data = (await response.json()) as {
        settings?: HomeSettings;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "홈 설정 저장에 실패했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setMessage("Trending 상품 설정을 저장했습니다.");
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">홈 Trending 상품</h2>
        <p className="mt-1 text-sm text-zinc-500">
          홈페이지 Trending(All) 탭에 노출할 SKU를 한 줄에 하나씩 입력하세요. 순서대로 표시되며,
          비어 있으면 VT·SKINFOOD·Torriden·COSRX·ANUA 등 브랜드가 섞인 기본 구성이 사용됩니다.
        </p>
      </div>

      <div>
        <label htmlFor="trending_skus" className="block text-sm font-medium text-zinc-700">
          Trending SKU 목록
        </label>
        <textarea
          id="trending_skus"
          name="trending_skus"
          rows={8}
          defaultValue={settings.trending_skus.join("\n")}
          placeholder={"VT-001\nSKINFOOD-123\n..."}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "저장 중…" : "Trending 설정 저장"}
      </button>
    </form>
  );
}
