"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

import { HeroBannerImage } from "@/components/store/hero-banner-image";
import type {
  HeroLayoutAnchorX,
  HeroLayoutAnchorY,
  HeroSlideLayoutPreset,
} from "@/lib/admin/hero-image-spec";
import { resolveHeroSlideLayout } from "@/lib/admin/hero-image-spec";

export type HeroBannerSlide = {
  id: string;
  src: string;
  href: string;
  brandLabel: string;
  layout?: import("@/lib/admin/hero-image-spec").HeroSlideLayout;
};

export type HeroCopy = {
  badge?: string | null;
  title: string;
  description: string;
  shopBestSellersLabel: string;
  shopBestSellersHref: string;
  wholesaleInquiryLabel: string;
  wholesaleInquiryHref: string;
};

type Props = {
  slides: HeroBannerSlide[];
  copy: HeroCopy;
};

const AUTOPLAY_MS = 5500;

const anchorXClass: Record<HeroLayoutAnchorX, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const anchorYClass: Record<HeroLayoutAnchorY, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

function HeroGradientOverlay({ strength }: { strength: number }) {
  const opacity = Math.min(Math.max(strength, 0), 100) / 100;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `linear-gradient(to right, rgba(255,255,255,${opacity}) 0%, rgba(255,255,255,${opacity * 0.55}) 42%, rgba(255,255,255,${opacity * 0.15}) 62%, transparent 78%)`,
      }}
      aria-hidden
    />
  );
}

function HeroCopyPanel({
  copy,
  layout,
  isMobile,
}: {
  copy: HeroCopy;
  layout: HeroSlideLayoutPreset;
  isMobile: boolean;
}) {
  return (
    <div
      className="pointer-events-auto relative z-20 w-full"
      style={{
        maxWidth: `${layout.maxWidth}px`,
        textAlign: layout.textAlign,
      }}
    >
      {copy.badge ? (
        <p
          className="mb-2 text-xs font-bold uppercase tracking-[0.2em] sm:text-sm"
          style={{ color: layout.descriptionColor }}
        >
          {copy.badge}
        </p>
      ) : null}
      <h1
        className="font-bold leading-tight tracking-tight"
        style={{
          color: layout.titleColor,
          fontSize: `${layout.titleSizePx}px`,
        }}
      >
        {copy.title}
      </h1>
      <p
        className="mt-3 leading-relaxed sm:mt-4"
        style={{
          color: layout.descriptionColor,
          fontSize: `${layout.descriptionSizePx}px`,
        }}
      >
        {copy.description}
      </p>
      <div
        className={`mt-5 flex flex-wrap gap-3 sm:mt-6 ${layout.textAlign === "center" ? "justify-center" : layout.textAlign === "right" ? "justify-end" : "justify-start"}`}
      >
        <Link
          href={copy.shopBestSellersHref}
          className="inline-flex min-h-11 items-center bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover"
        >
          {copy.shopBestSellersLabel}
        </Link>
        <Link
          href={copy.wholesaleInquiryHref}
          className="inline-flex min-h-11 items-center border border-zinc-300 bg-white/90 px-6 py-3 text-sm font-bold uppercase tracking-wide text-zinc-800 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
        >
          {copy.wholesaleInquiryLabel}
        </Link>
      </div>
      {isMobile ? null : (
        <span className="sr-only">Hero banner content overlay</span>
      )}
    </div>
  );
}

function HeroSlideFrame({
  slide,
  copy,
  priority,
}: {
  slide: HeroBannerSlide;
  copy: HeroCopy;
  priority?: boolean;
}) {
  const { desktop, mobile } = resolveHeroSlideLayout(slide.layout);

  return (
    <div className="relative aspect-[1920/600] w-full bg-[#f4f2ef]">
      <Link
        href={slide.href}
        aria-label={slide.brandLabel}
        className="absolute inset-0 z-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <HeroBannerImage
          src={slide.src}
          priority={priority}
          imageFocus={desktop.imageFocus}
          className="hidden sm:block"
        />
        <HeroBannerImage
          src={slide.src}
          priority={priority}
          imageFocus={mobile.imageFocus}
          className="sm:hidden"
        />
      </Link>

      <div className="hidden sm:block">
        <HeroGradientOverlay strength={desktop.gradientStrength} />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 z-10 hidden px-4 sm:flex sm:px-6 lg:px-10 ${anchorXClass[desktop.alignX]} ${anchorYClass[desktop.alignY]}`}
        style={{
          paddingLeft: desktop.alignX === "left" ? desktop.offsetX : undefined,
          paddingRight: desktop.alignX === "right" ? desktop.offsetX : undefined,
          paddingTop: desktop.alignY === "top" ? desktop.offsetY : undefined,
          paddingBottom: desktop.alignY === "bottom" ? desktop.offsetY : undefined,
          transform:
            desktop.alignX === "center" || desktop.alignY === "center"
              ? `translate(${desktop.alignX === "center" ? desktop.offsetX : 0}px, ${desktop.alignY === "center" ? desktop.offsetY : 0}px)`
              : undefined,
        }}
      >
        <HeroCopyPanel copy={copy} layout={desktop} isMobile={false} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 sm:hidden"
        style={{
          background: `linear-gradient(to top, rgba(255,255,255,${mobile.gradientStrength / 100}) 0%, rgba(255,255,255,${(mobile.gradientStrength / 100) * 0.35}) 45%, transparent 72%)`,
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex px-4 sm:hidden ${anchorXClass[mobile.alignX]} ${anchorYClass[mobile.alignY]}`}
        style={{
          paddingLeft: mobile.alignX === "left" ? mobile.offsetX : undefined,
          paddingRight: mobile.alignX === "right" ? mobile.offsetX : undefined,
          paddingTop: mobile.alignY === "top" ? mobile.offsetY : undefined,
          paddingBottom: mobile.alignY === "bottom" ? mobile.offsetY : undefined,
          transform:
            mobile.alignX === "center" || mobile.alignY === "center"
              ? `translate(${mobile.alignX === "center" ? mobile.offsetX : 0}px, ${mobile.alignY === "center" ? mobile.offsetY : 0}px)`
              : undefined,
        }}
      >
        <HeroCopyPanel copy={copy} layout={mobile} isMobile />
      </div>
    </div>
  );
}

export function HeroBannerSlider({ slides, copy }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const slideCount = slides.length;
  const showControls = slideCount > 1;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !showControls) {
      return;
    }

    const onScroll = () => {
      const width = element.clientWidth;
      if (width <= 0) {
        return;
      }

      const index = Math.round(element.scrollLeft / width);
      const nextIndex = Math.min(Math.max(index, 0), slideCount - 1);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [showControls, slideCount]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = containerRef.current;
      if (!element) {
        return;
      }

      const width = element.clientWidth;
      if (width <= 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(index, 0), slideCount - 1);
      element.scrollTo({
        left: nextIndex * width,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    },
    [prefersReducedMotion, slideCount],
  );

  useEffect(() => {
    if (!showControls || autoplayPaused || prefersReducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = activeIndexRef.current;
      const nextIndex = current >= slideCount - 1 ? 0 : current + 1;
      scrollToIndex(nextIndex);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [autoplayPaused, prefersReducedMotion, scrollToIndex, showControls, slideCount]);

  const finishDrag = useCallback(
    (pointerId: number) => {
      if (!isDragging.current) {
        return;
      }

      isDragging.current = false;
      const element = containerRef.current;
      if (!element) {
        return;
      }

      element.releasePointerCapture(pointerId);
      element.style.cursor = showControls ? "grab" : "";

      const width = element.clientWidth;
      if (width <= 0) {
        return;
      }

      const index = Math.round(element.scrollLeft / width);
      scrollToIndex(index);
    },
    [scrollToIndex, showControls],
  );

  const goToPrevious = useCallback(() => {
    setAutoplayPaused(true);
    scrollToIndex(activeIndex <= 0 ? slideCount - 1 : activeIndex - 1);
  }, [activeIndex, scrollToIndex, slideCount]);

  const goToNext = useCallback(() => {
    setAutoplayPaused(true);
    scrollToIndex(activeIndex >= slideCount - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, scrollToIndex, slideCount]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!showControls) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    },
    [goToNext, goToPrevious, showControls],
  );

  const pauseAutoplay = useCallback(() => setAutoplayPaused(true), []);
  const resumeAutoplay = useCallback(() => setAutoplayPaused(false), []);

  if (slideCount === 0) {
    const { desktop } = resolveHeroSlideLayout(null);

    return (
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="relative aspect-[1920/600] w-full bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
            <HeroCopyPanel copy={copy} layout={desktop} isMobile={false} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      tabIndex={showControls ? 0 : undefined}
      onKeyDown={showControls ? handleKeyDown : undefined}
      className="border-b border-zinc-200 bg-white outline-none"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div
          className="relative w-full overflow-hidden"
          onMouseEnter={showControls ? pauseAutoplay : undefined}
          onMouseLeave={showControls ? resumeAutoplay : undefined}
          onFocusCapture={showControls ? pauseAutoplay : undefined}
          onBlurCapture={showControls ? resumeAutoplay : undefined}
        >
        <div
          ref={showControls ? containerRef : undefined}
          className={
            showControls
              ? "relative z-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "relative z-0 w-full"
          }
          style={showControls ? { cursor: "grab", touchAction: "pan-x" } : undefined}
          onPointerDown={
            showControls
              ? (event) => {
                  pauseAutoplay();
                  const element = containerRef.current;
                  if (!element) {
                    return;
                  }

                  isDragging.current = true;
                  dragStart.current = { x: event.clientX, scrollLeft: element.scrollLeft };
                  element.setPointerCapture(event.pointerId);
                  element.style.cursor = "grabbing";
                }
              : undefined
          }
          onPointerMove={
            showControls
              ? (event) => {
                  if (!isDragging.current) {
                    return;
                  }

                  const element = containerRef.current;
                  if (!element) {
                    return;
                  }

                  const delta = event.clientX - dragStart.current.x;
                  element.scrollLeft = dragStart.current.scrollLeft - delta;
                }
              : undefined
          }
          onPointerUp={showControls ? (event) => finishDrag(event.pointerId) : undefined}
          onPointerCancel={showControls ? (event) => finishDrag(event.pointerId) : undefined}
          onTouchStart={showControls ? pauseAutoplay : undefined}
          aria-live="polite"
          aria-roledescription="carousel"
          aria-label="Featured brand products"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={showControls ? "min-w-full shrink-0 snap-center snap-always" : "w-full"}
              aria-hidden={showControls && index !== activeIndex ? true : undefined}
            >
              <HeroSlideFrame slide={slide} copy={copy} priority={index === 0} />
            </div>
          ))}
        </div>

        {showControls ? (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:left-4"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={goToNext}
              className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-4"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center gap-1 sm:bottom-4 sm:gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Banner ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => {
                    pauseAutoplay();
                    scrollToIndex(index);
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === activeIndex ? "bg-zinc-800" : "bg-zinc-400/80 hover:bg-zinc-600"
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </>
        ) : null}
        </div>
      </div>
    </section>
  );
}
