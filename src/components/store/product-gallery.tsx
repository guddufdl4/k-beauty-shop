"use client";

import { useMemo, useState } from "react";
import { isCategoryPlaceholderUrl } from "@/lib/product-images";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

type Props = {
  images: GalleryImage[];
  fallbackUrl: string | null;
  productName: string;
  expandLabel: string;
  closeLabel: string;
};

export function ProductGallery({
  images,
  fallbackUrl,
  productName,
  expandLabel,
  closeLabel,
}: Props) {
  const usable = useMemo(
    () =>
      images.filter(
        (image) => image.url && !isCategoryPlaceholderUrl(image.url),
      ),
    [images],
  );
  const fallback =
    fallbackUrl && !isCategoryPlaceholderUrl(fallbackUrl) ? fallbackUrl : null;
  const urls = usable.length
    ? usable
    : fallback
      ? [{ id: "primary", url: fallback, alt: productName }]
      : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const active = urls[Math.min(activeIndex, Math.max(urls.length - 1, 0))];

  if (!active) {
    return null;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full lg:mx-0 lg:max-w-lg">
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="relative aspect-square w-full max-w-full rounded-2xl bg-zinc-50 ring-1 ring-zinc-200"
        aria-label={expandLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.alt || productName}
          width={800}
          height={800}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </button>
      {urls.length > 1 ? (
        <div className="mt-4 grid min-w-0 max-w-full grid-cols-4 gap-3">
          {urls.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${productName} ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={`relative aspect-square w-full min-w-0 max-w-full rounded-lg bg-zinc-50 ring-1 ${
                index === activeIndex ? "ring-violet-700" : "ring-zinc-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt || productName}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expandLabel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpanded(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt || productName}
            className="max-h-[90vh] max-w-full object-contain"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-800"
            onClick={() => setExpanded(false)}
          >
            {closeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function resolveGalleryFallbackUrl(product: {
  image_url?: string | null;
  images?: Array<{ url: string; is_primary: boolean }>;
}): string | null {
  const url =
    product.images?.find((image) => image.is_primary)?.url ??
    product.images?.[0]?.url ??
    product.image_url ??
    null;
  return url && !isCategoryPlaceholderUrl(url) ? url : null;
}
