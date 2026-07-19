"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { SiteSettings } from "@/types/database";
import { validateClientProductImageFile } from "@/lib/admin/product-image-upload";

type Props = {
  initialSettings: SiteSettings;
};

export function AdminHeroSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, setPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      hero_badge: String(formData.get("hero_badge") ?? "").trim() || null,
      hero_title: String(formData.get("hero_title") ?? "").trim() || null,
      hero_subtitle: String(formData.get("hero_subtitle") ?? "").trim() || null,
      hero_button_text: String(formData.get("hero_button_text") ?? "").trim() || null,
      hero_button_link: String(formData.get("hero_button_link") ?? "").trim() || null,
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
        setError(data.error ?? "배너 설정 저장에 실패했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setMessage("메인 배너 설정을 저장했습니다.");
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleImageUpload(file: File) {
    const validationError = validateClientProductImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadPending(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/admin/settings/hero-image", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        settings?: SiteSettings;
        hero_image_url?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "배너 이미지 업로드에 실패했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setMessage("배너 이미지를 업로드했습니다.");
    } catch {
      setError("네트워크 오류로 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadPending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleClearImage() {
    setUploadPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_image_url: null }),
      });

      const data = (await response.json()) as {
        settings?: SiteSettings;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "배너 이미지를 삭제하지 못했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
      }
      setMessage("배너 이미지를 삭제했습니다.");
    } catch {
      setError("네트워크 오류로 이미지를 삭제하지 못했습니다.");
    } finally {
      setUploadPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">배너 배경 이미지</h2>
          <p className="mt-1 text-sm text-zinc-500">
            홈페이지 상단 히어로 영역 배경으로 표시됩니다. JPG, PNG, WEBP (최대 5MB).
          </p>
        </div>

        {settings.hero_image_url ? (
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            <div className="relative aspect-[21/9] w-full">
              <Image
                src={settings.hero_image_url}
                alt="현재 메인 배너 배경"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <div className="flex aspect-[21/9] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
            등록된 배경 이미지 없음 (기본 그라데이션 사용)
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            {uploadPending ? "업로드 중…" : "이미지 업로드"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImageUpload(file);
                }
              }}
            />
          </label>
          {settings.hero_image_url ? (
            <button
              type="button"
              disabled={uploadPending}
              onClick={() => void handleClearImage()}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              이미지 삭제
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-zinc-100 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">배너 문구</h2>
          <p className="mt-1 text-sm text-zinc-500">
            비워 두면 다국어 기본 문구를 사용합니다 (예: Wholesale, UPTO 70% OFF).
          </p>
        </div>

        <div>
          <label htmlFor="hero_badge" className="block text-sm font-medium text-zinc-700">
            상단 뱃지
          </label>
          <input
            id="hero_badge"
            name="hero_badge"
            defaultValue={settings.hero_badge ?? ""}
            placeholder="WHOLESALE"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="hero_title" className="block text-sm font-medium text-zinc-700">
            메인 제목
          </label>
          <input
            id="hero_title"
            name="hero_title"
            defaultValue={settings.hero_title ?? ""}
            placeholder="UPTO 70% OFF"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="hero_subtitle" className="block text-sm font-medium text-zinc-700">
            부제목 / 설명
          </label>
          <textarea
            id="hero_subtitle"
            name="hero_subtitle"
            rows={3}
            defaultValue={settings.hero_subtitle ?? ""}
            placeholder="홈페이지 히어로 영역에 표시할 설명 문구"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="hero_button_text" className="block text-sm font-medium text-zinc-700">
            버튼 텍스트
          </label>
          <input
            id="hero_button_text"
            name="hero_button_text"
            defaultValue={settings.hero_button_text ?? ""}
            placeholder="LEARN MORE"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="hero_button_link" className="block text-sm font-medium text-zinc-700">
            버튼 링크
          </label>
          <input
            id="hero_button_link"
            name="hero_button_link"
            defaultValue={settings.hero_button_link ?? ""}
            placeholder="/products"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            내부 경로는 <code className="text-xs">/products</code> 형식, 외부 URL도 가능합니다.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {pending ? "저장 중…" : "배너 설정 저장"}
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
