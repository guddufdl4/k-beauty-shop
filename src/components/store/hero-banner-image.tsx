"use client";

import { useState } from "react";

import type { HeroImageFocus } from "@/lib/admin/hero-image-spec";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  preload?: boolean;
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
  alt,
  priority = false,
  preload = false,
  imageFocus = "center",
  className,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    <>
      {!loaded ? (
        <div
          className={`absolute inset-0 animate-pulse bg-[#ece9e4] ${className ?? ""}`}
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={1920}
        height={600}
        sizes="(max-width: 1280px) 100vw, 1280px"
        className={`absolute inset-0 block h-full w-full object-contain ${focusClass[imageFocus]} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${className ?? ""}`}
        fetchPriority={priority || preload ? "high" : "auto"}
        loading={priority || preload ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </>
  );
}
