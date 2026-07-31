"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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

function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

export function HeroBannerImage({
  src,
  alt,
  priority = false,
  preload = false,
  imageFocus = "center",
  className,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [trackedSrc, setTrackedSrc] = useState(src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setLoaded(false);
    setFailed(false);
  }

  const markLoadedIfReady = useCallback(() => {
    const img = imgRef.current;
    if (img && isImageReady(img)) {
      setLoaded(true);
      setFailed(false);
    }
  }, []);

  useLayoutEffect(() => {
    markLoadedIfReady();
  }, [src, markLoadedIfReady]);

  const handleImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node && isImageReady(node)) {
        setLoaded(true);
        setFailed(false);
      }
    },
    [],
  );

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setFailed(false);
  }, []);

  const handleError = useCallback(() => {
    setFailed(true);
    setLoaded(false);
  }, []);

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
        ref={handleImgRef}
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
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}
