"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS,
  PRODUCT_IMAGE_CANVAS_SIZES,
  type ProductImageNormalizeOptions,
  loadProductImageUploadSettings,
  saveProductImageUploadSettings,
} from "@/lib/admin/product-image-normalize-options";

type Props = {
  options: ProductImageNormalizeOptions;
  onChange: (options: ProductImageNormalizeOptions) => void;
  disabled?: boolean;
};

export function ProductImageUploadSettingsPanel({ options, onChange, disabled }: Props) {
  const baseId = useId();

  const update = useCallback(
    (patch: Partial<ProductImageNormalizeOptions>) => {
      const next = { ...options, ...patch };
      onChange(next);
      saveProductImageUploadSettings(next);
    },
    [onChange, options],
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        이미지 처리 설정
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${baseId}-canvas`} className="block text-[11px] font-medium text-zinc-600">
            캔버스 크기
          </label>
          <select
            id={`${baseId}-canvas`}
            value={options.canvasSize}
            disabled={disabled}
            onChange={(event) => update({ canvasSize: Number(event.target.value) })}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
          >
            {PRODUCT_IMAGE_CANVAS_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} × {size}px
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${baseId}-fit`} className="block text-[11px] font-medium text-zinc-600">
            맞춤 방식
          </label>
          <select
            id={`${baseId}-fit`}
            value={options.fit}
            disabled={disabled}
            onChange={(event) =>
              update({ fit: event.target.value as ProductImageNormalizeOptions["fit"] })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="inside">전체 보기 (contain)</option>
            <option value="cover">꽉 채우기 (cover)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`${baseId}-background`}
            className="block text-[11px] font-medium text-zinc-600"
          >
            여백 배경색
          </label>
          <select
            id={`${baseId}-background`}
            value={options.background}
            disabled={disabled}
            onChange={(event) =>
              update({
                background: event.target.value as ProductImageNormalizeOptions["background"],
              })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="white">흰색</option>
            <option value="zinc">연한 회색 (zinc)</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={options.trimEnabled}
              disabled={disabled}
              onChange={(event) => update({ trimEnabled: event.target.checked })}
              className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
            />
            <span>흰 여백 자동 잘라내기</span>
          </label>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
        설정은 브라우저에 저장되어 다음 업로드에도 유지됩니다.
      </p>
    </div>
  );
}

export function useProductImageUploadSettings(): [
  ProductImageNormalizeOptions,
  (options: ProductImageNormalizeOptions) => void,
] {
  const [options, setOptions] = useState(DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS);

  useEffect(() => {
    setOptions(loadProductImageUploadSettings());
  }, []);

  const setAndPersist = useCallback((next: ProductImageNormalizeOptions) => {
    setOptions(next);
    saveProductImageUploadSettings(next);
  }, []);

  return [options, setAndPersist];
}