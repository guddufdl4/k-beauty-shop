"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

import { HeroBannerImage } from "@/components/store/hero-banner-image";

export type HeroBannerSlide = {
  id: string;
  src: string;
  href: string;
  objectPosition?: "left" | "center" | "right";
  brandLabel: string;
};

export type HeroCopy = {
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

function HeroCopyPanel({ copy, className }: { copy: HeroCopy; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl xl:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600 sm:mt-4 sm:text-base lg:text-lg">
        {copy.description}
      </p>
      <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
        <Link
          href={copy.shopBestSellersHref}
          className="inline-flex min-h-11 items-center bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover"
        >
          {copy.shopBestSellersLabel}
        </Link>
        <Link
          href={copy.wholesaleInquiryHref}
          className="inline-flex min-h-11 items-center border border-zinc-300 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-zinc-800 transition-colors hover:border-accent hover:text-accent"
        >
          {copy.wholesaleInquiryLabel}
        </Link>
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

  const sliderPanel = (
    <div
      className="relative w-full min-w-0 sm:min-h-[280px] lg:min-h-[360px] lg:max-w-none"
      onMouseEnter={showControls ? pauseAutoplay : undefined}
      onMouseLeave={showControls ? resumeAutoplay : undefined}
      onFocusCapture={showControls ? pauseAutoplay : undefined}
      onBlurCapture={showControls ? resumeAutoplay : undefined}
    >
      <div
        ref={showControls ? containerRef : undefined}
        className={
          showControls
            ? "relative z-0 flex min-h-[inherit] snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "relative z-0 min-h-[inherit] w-full min-w-0"
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
            className={
              showControls
                ? "min-h-[inherit] w-full min-w-full shrink-0 snap-center snap-always"
                : "min-h-[inherit] w-full min-w-0"
            }
            aria-hidden={showControls && index !== activeIndex ? true : undefined}
          >
            <HeroBannerImage
              src={slide.src}
              href={slide.href}
              priority={index === 0}
              objectPosition={slide.objectPosition}
              label={slide.brandLabel}
            />
          </div>
        ))}
      </div>

      {showControls ? (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={goToPrevious}
            className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:left-2"
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
            className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1 sm:bottom-3 sm:gap-2">
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
  );

  if (slideCount === 0) {
    return (
      <section className="overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
          <HeroCopyPanel copy={copy} className="max-w-xl" />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      tabIndex={showControls ? 0 : undefined}
      onKeyDown={showControls ? handleKeyDown : undefined}
      className="overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-slate-50 via-white to-rose-50/30 outline-none"
    >
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
          <HeroCopyPanel copy={copy} className="relative z-10 hidden max-w-xl lg:block" />

          <div className="relative min-w-0 lg:min-h-[360px]">
            {sliderPanel}
            <HeroCopyPanel
              copy={copy}
              className="relative z-10 mt-4 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-md sm:p-5 lg:hidden"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
