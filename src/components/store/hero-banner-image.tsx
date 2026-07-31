"use client";

import { useState } from "react";

import type { HeroImageFocus } from "@/lib/admin/hero-image-spec";

type Props = {
  src: string;
  priority?: boolean;
  imageFocus?: HeroImageFocus;
  className?: string;
};

const focusClass: Record<HeroImageFocus, string> = {
  left: "object-left",
  center: "object-center",
  right: "object-right",
};

export function HeroBannerImage({
  src,
  priority = false,
  imageFocus = "center",
  className,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`absolute inset-0 bg-[#f4f2ef] ${className ?? ""}`}
        role="img"
        aria-label="Banner image unavailable"
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      width={1920}
      height={600}
      sizes="(max-width: 1280px) 100vw, 1280px"
      className={`absolute inset-0 block h-full w-full object-contain ${focusClass[imageFocus]} ${className ?? ""}`}
      fetchPriority={priority ? "high" : "auto"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
