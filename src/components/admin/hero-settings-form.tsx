"use client";

import { useRef, useState } from "react";
import type { HeroSlide, SiteSettings } from "@/types/database";
import { formatHeroImageRecommendation } from "@/lib/admin/hero-image-spec";
import {
  validateClientProductImageFile,
  withStorageImageCacheBuster,
} from "@/lib/admin/product-image-upload";

type Props = {
  initialSettings: SiteSettings;
};

type SlideDraft = HeroSlide & {
  previewSrc?: string | null;
};

function sortSlides(slides: SlideDraft[]): SlideDraft[] {
  return [...slides]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((slide, index) => ({ ...slide, order: index }));
}

function initialSlides(settings: SiteSettings): SlideDraft[] {
  const source =
    settings.hero_slides.length > 0
      ? settings.hero_slides
      : settings.hero_image_url
        ? [{ id: "legacy", image_url: settings.hero_image_url, order: 0 }]
        : [];

  return sortSlides(source.map((slide) => ({ ...slide })));
}

export function AdminHeroSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [slides, setSlides] = useState<SlideDraft[]>(() => initialSlides(initialSettings));
  const [previewVersion, setPreviewVersion] = useState(initialSettings.updated_at ?? "");
  const [pending, setPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [reorderPending, setReorderPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function slidePreviewSrc(slide: SlideDraft): string {
    if (slide.previewSrc) {
      return slide.previewSrc;
    }

    return withStorageImageCacheBuster(slide.image_url, previewVersion || settings.updated_at);
  }

  async function persistSlides(nextSlides: SlideDraft[], successMessage: string) {
    setReorderPending(true);
    setMessage(null);
    setError(null);

    const payloadSlides = sortSlides(nextSlides).map(({ id, image_url, order }) => ({
      id,
      image_url,
      order,
    }));

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_slides: payloadSlides,
          hero_image_url: payloadSlides[0]?.image_url ?? null,
        }),
      });

      const data = (await response.json()) as {
        settings?: SiteSettings;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "배너 슬라이드 저장에 실패했습니다.");
        return false;
      }

      if (data.settings) {
        setSettings(data.settings);
        setPreviewVersion(data.settings.updated_at);
        setSlides(initialSlides(data.settings));
      } else {
        setSlides(sortSlides(nextSlides));
      }

      setMessage(successMessage);
      return true;
    } catch {
      setError("네트워크 오류로 슬라이드를 저장하지 못했습니다.");
      return false;
    } finally {
      setReorderPending(false);
    }
  }

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
        hero_slide?: HeroSlide;
        hero_image_preview_url?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "배너 이미지 업로드에 실패했습니다.");
        return;
      }

      if (data.settings) {
        setSettings(data.settings);
        setPreviewVersion(data.settings.updated_at);
        setSlides(initialSlides(data.settings));
      }

      setMessage("배너 슬라이드를 추가했습니다.");
    } catch {
      setError("네트워크 오류로 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadPending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDeleteSlide(slideId: string) {
    const nextSlides = slides.filter((slide) => slide.id !== slideId);
    await persistSlides(nextSlides, "배너 슬라이드를 삭제했습니다.");
  }

  async function handleMoveSlide(slideId: string, direction: -1 | 1) {
    const ordered = sortSlides(slides);
    const index = ordered.findIndex((slide) => slide.id === slideId);
    if (index < 0) {
      return;
    }

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const nextSlides = [...ordered];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(targetIndex, 0, moved);
    await persistSlides(nextSlides, "배너 순서를 변경했습니다.");
  }

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const ordered = sortSlides(slides);
    const fromIndex = ordered.findIndex((slide) => slide.id === draggingId);
    const toIndex = ordered.findIndex((slide) => slide.id === targetId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null);
      return;
    }

    const nextSlides = [...ordered];
    const [moved] = nextSlides.splice(fromIndex, 1);
    nextSlides.splice(toIndex, 0, moved);
    setDraggingId(null);
    await persistSlides(nextSlides, "배너 순서를 변경했습니다.");
  }

  const hasSlides = slides.length > 0;
  const recommendedSize = formatHeroImageRecommendation();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">배너 슬라이드</h2>
          <p className="mt-1 text-sm text-zinc-500">
            홈페이지 상단 히어로 영역에 표시될 배너 이미지입니다. 여러 장을 등록하면 드래그·스와이프로
            넘길 수 있습니다.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            권장 크기: <strong>{recommendedSize}</strong>. JPG·PNG·WEBP 업로드 가능. JPG는 WebP(품질 90)로
            저장되며 PNG는 원본 형식을 유지합니다.
          </p>
          {hasSlides ? (
            <p className="mt-1 text-sm text-zinc-600">
              이미지가 등록되면 홈페이지에는 배너 이미지만 표시됩니다. 아래 문구는 이미지가 없을 때만
              사용됩니다.
            </p>
          ) : null}
        </div>

        {hasSlides ? (
          <ul className="space-y-3">
            {sortSlides(slides).map((slide, index) => (
              <li
                key={slide.id}
                draggable
                onDragStart={() => setDraggingId(slide.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(slide.id)}
                className={`overflow-hidden rounded-xl border bg-zinc-50 ${
                  draggingId === slide.id ? "border-rose-300 opacity-70" : "border-zinc-200"
                }`}
              >
                <div className="relative aspect-[21/9] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slidePreviewSrc(slide)}
                    alt={`배너 슬라이드 ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2">
                  <p className="text-xs font-medium text-zinc-600">
                    슬라이드 {index + 1}
                    {index === 0 ? " · 첫 번째 배너" : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={reorderPending || index === 0}
                      onClick={() => void handleMoveSlide(slide.id, -1)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={reorderPending || index === slides.length - 1}
                      onClick={() => void handleMoveSlide(slide.id, 1)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={uploadPending || reorderPending}
                      onClick={() => void handleDeleteSlide(slide.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex aspect-[21/9] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
            등록된 배너 없음 (기본 그라데이션 사용)
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            {uploadPending ? "업로드 중…" : "슬라이드 추가"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadPending || reorderPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImageUpload(file);
                }
              }}
            />
          </label>
        </div>
      </section>

      <section
        key={settings.updated_at}
        className="space-y-4 border-t border-zinc-100 pt-6"
      >
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
