"use client";

import { useState } from "react";
import type { SiteSettings } from "@/types/database";

type Props = {
  initialSettings: SiteSettings;
};

export function AdminSettingsForm({ initialSettings }: Props) {
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

    const payload = {
      store_name: String(formData.get("store_name") ?? "").trim(),
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      maintenance_enabled: formData.get("maintenance_enabled") === "on",
      maintenance_message: String(formData.get("maintenance_message") ?? ""),
      wholesale_price_label:
        String(formData.get("wholesale_price_label") ?? "").trim() || null,
      moq_label: String(formData.get("moq_label") ?? "").trim() || null,
      min_order_note: String(formData.get("min_order_note") ?? "").trim() || null,
    };

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        settings?: SiteSettings;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "설정 저장에 실패했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setMessage("설정을 저장했습니다.");
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">쇼핑몰 기본 정보</h2>
          <p className="mt-1 text-sm text-zinc-500">
            스토어 헤더·푸터에 표시되는 이름과 문의 이메일입니다.
          </p>
        </div>

        <div>
          <label htmlFor="store_name" className="block text-sm font-medium text-zinc-700">
            쇼핑몰 이름 *
          </label>
          <input
            id="store_name"
            name="store_name"
            required
            defaultValue={settings.store_name}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-zinc-700">
            문의 이메일
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email ?? ""}
            placeholder="support@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">푸터에 mailto 링크로 표시됩니다.</p>
        </div>
      </section>

      <section className="space-y-4 border-t border-zinc-100 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">점검·공지 배너</h2>
          <p className="mt-1 text-sm text-zinc-500">
            활성화하면 모든 스토어 페이지 상단에 안내 배너가 표시됩니다.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="maintenance_enabled"
            defaultChecked={settings.maintenance_enabled}
            className="size-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          점검/공지 배너 표시
        </label>

        <div>
          <label
            htmlFor="maintenance_message"
            className="block text-sm font-medium text-zinc-700"
          >
            배너 메시지
          </label>
          <textarea
            id="maintenance_message"
            name="maintenance_message"
            rows={3}
            defaultValue={settings.maintenance_message}
            placeholder="예: 6월 20일 02:00–04:00 시스템 점검으로 주문 처리가 지연될 수 있습니다."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-zinc-100 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">B2B 표시 문구</h2>
          <p className="mt-1 text-sm text-zinc-500">
            비워 두면 다국어 기본 문구를 사용합니다. 상품 상세·장바구니에 반영됩니다.
          </p>
        </div>

        <div>
          <label
            htmlFor="wholesale_price_label"
            className="block text-sm font-medium text-zinc-700"
          >
            도매가 라벨
          </label>
          <input
            id="wholesale_price_label"
            name="wholesale_price_label"
            defaultValue={settings.wholesale_price_label ?? ""}
            placeholder="도매가 (B2B)"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="moq_label" className="block text-sm font-medium text-zinc-700">
            MOQ 라벨
          </label>
          <input
            id="moq_label"
            name="moq_label"
            defaultValue={settings.moq_label ?? ""}
            placeholder="박스 최소 주문"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="min_order_note" className="block text-sm font-medium text-zinc-700">
            최소 주문 안내
          </label>
          <textarea
            id="min_order_note"
            name="min_order_note"
            rows={2}
            defaultValue={settings.min_order_note ?? ""}
            placeholder="예: 해외 B2B 주문은 박스 단위 MOQ를 준수해 주세요."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {pending ? "저장 중…" : "설정 저장"}
        </button>
        {settings.updated_at ? (
          <p className="text-xs text-zinc-500">
            마지막 수정: {new Date(settings.updated_at).toLocaleString("ko-KR")}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </form>
  );
}