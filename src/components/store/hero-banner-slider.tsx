"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { HeroBannerImage } from "@/components/store/hero-banner-image";
import styles from "@/components/store/hero-banner-slider.module.css";
import { isExternalHeroHref } from "@/lib/store/storefront-href";
import type {
  HeroLayoutAnchorX,
  HeroLayoutAnchorY,
  HeroSlideLayoutPreset,
} from "@/lib/admin/hero-image-spec";
import { resolveHeroSlideLayout } from "@/lib/admin/hero-image-spec";

export type HeroBannerSlide = {
  id: string;
  src: string;
  mobileSrc?: string;
  href: string;
  brandLabel: string;
  layout?: import("@/lib/admin/hero-image-spec").HeroSlideLayout;
  copy?: Partial<HeroCopy>;
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

function mergeSlideCopy(defaultCopy: HeroCopy, slide: HeroBannerSlide): HeroCopy {
  const override = slide.copy;
  if (!override) {
    return defaultCopy;
  }

  return {
    badge: override.badge !== undefined ? override.badge : defaultCopy.badge,
    title: override.title?.trim() || defaultCopy.title,
    description: override.description?.trim() || defaultCopy.description,
    shopBestSellersLabel: override.shopBestSellersLabel?.trim() || defaultCopy.shopBestSellersLabel,
    shopBestSellersHref: override.shopBestSellersHref?.trim() || defaultCopy.shopBestSellersHref,
    wholesaleInquiryLabel: override.wholesaleInquiryLabel?.trim() || defaultCopy.wholesaleInquiryLabel,
    wholesaleInquiryHref: override.wholesaleInquiryHref?.trim() || defaultCopy.wholesaleInquiryHref,
  };
}

function preloadImage(url: string) {
  const img = new Image();
  img.src = url;
}

function HeroNavLink({
  href,
  children,
  className,
  tabIndex,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tabIndex?: number;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  if (isExternalHeroHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden || undefined}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden || undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

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

const anchorXClassSm: Record<HeroLayoutAnchorX, string> = {
  left: "sm:justify-start",
  center: "sm:justify-center",
  right: "sm:justify-end",
};

const anchorYClassSm: Record<HeroLayoutAnchorY, string> = {
  top: "sm:items-start",
  center: "sm:items-center",
  bottom: "sm:items-end",
};

type HeroCopyCssVars = CSSProperties & {
  "--hero-overlay-pl"?: string;
  "--hero-overlay-pr"?: string;
  "--hero-overlay-pt"?: string;
  "--hero-overlay-pb"?: string;
  "--hero-overlay-transform"?: string;
  "--hero-overlay-pl-sm"?: string;
  "--hero-overlay-pr-sm"?: string;
  "--hero-overlay-pt-sm"?: string;
  "--hero-overlay-pb-sm"?: string;
  "--hero-overlay-transform-sm"?: string;
  "--hero-max-w"?: string;
  "--hero-max-w-sm"?: string;
  "--hero-title-size"?: string;
  "--hero-title-size-sm"?: string;
  "--hero-desc-size"?: string;
  "--hero-desc-size-sm"?: string;
  "--hero-title-color"?: string;
  "--hero-title-color-sm"?: string;
  "--hero-desc-color"?: string;
  "--hero-desc-color-sm"?: string;
  "--hero-text-align"?: string;
  "--hero-text-align-sm"?: string;
  "--hero-cta-justify"?: string;
  "--hero-cta-justify-sm"?: string;
};

function textAlignToJustify(textAlign: HeroSlideLayoutPreset["textAlign"]): string {
  if (textAlign === "center") {
    return "center";
  }
  if (textAlign === "right") {
    return "flex-end";
  }
  return "flex-start";
}

function mobileOverlayEdgeStyles(preset: HeroSlideLayoutPreset) {
  return {
    pl: preset.offsetX,
    pr: 12,
    pt: preset.alignY === "top" ? preset.offsetY : 0,
    pb: preset.alignY === "bottom" ? preset.offsetY : 0,
    transform: "none" as const,
  };
}

function desktopOverlayEdgeStyles(preset: HeroSlideLayoutPreset) {
  const transform =
    preset.alignX === "center" || preset.alignY === "center"
      ? `translate(${preset.alignX === "center" ? preset.offsetX : 0}px, ${preset.alignY === "center" ? preset.offsetY : 0}px)`
      : "none";

  return {
    pl: preset.alignX === "left" ? preset.offsetX : 0,
    pr: preset.alignX === "right" ? preset.offsetX : 0,
    pt: preset.alignY === "top" ? preset.offsetY : 0,
    pb: preset.alignY === "bottom" ? preset.offsetY : 0,
    transform,
  };
}

function buildHeroCopyCssVars(
  mobile: HeroSlideLayoutPreset,
  desktop: HeroSlideLayoutPreset,
): HeroCopyCssVars {
  const mobileEdges = mobileOverlayEdgeStyles(mobile);
  const desktopEdges = desktopOverlayEdgeStyles(desktop);

  return {
    "--hero-overlay-pl": `${mobileEdges.pl}px`,
    "--hero-overlay-pr": `${mobileEdges.pr}px`,
    "--hero-overlay-pt": `${mobileEdges.pt}px`,
    "--hero-overlay-pb": `${mobileEdges.pb}px`,
    "--hero-overlay-transform": mobileEdges.transform,
    "--hero-overlay-pl-sm": `${desktopEdges.pl}px`,
    "--hero-overlay-pr-sm": `${desktopEdges.pr}px`,
    "--hero-overlay-pt-sm": `${desktopEdges.pt}px`,
    "--hero-overlay-pb-sm": `${desktopEdges.pb}px`,
    "--hero-overlay-transform-sm": desktopEdges.transform,
    "--hero-max-w": `${mobile.maxWidth}px`,
    "--hero-max-w-sm": `${desktop.maxWidth}px`,
    "--hero-title-size": `${mobile.titleSizePx}px`,
    "--hero-title-size-sm": `${desktop.titleSizePx}px`,
    "--hero-desc-size": `${mobile.descriptionSizePx}px`,
    "--hero-desc-size-sm": `${desktop.descriptionSizePx}px`,
    "--hero-title-color": mobile.titleColor,
    "--hero-title-color-sm": desktop.titleColor,
    "--hero-desc-color": mobile.descriptionColor,
    "--hero-desc-color-sm": desktop.descriptionColor,
    "--hero-text-align": mobile.textAlign,
    "--hero-text-align-sm": desktop.textAlign,
    "--hero-cta-justify": textAlignToJustify(mobile.textAlign),
    "--hero-cta-justify-sm": textAlignToJustify(desktop.textAlign),
  };
}

function buildDesktopOnlyCopyCssVars(desktop: HeroSlideLayoutPreset): HeroCopyCssVars {
  const justify = textAlignToJustify(desktop.textAlign);

  return {
    "--hero-max-w": `${desktop.maxWidth}px`,
    "--hero-max-w-sm": `${desktop.maxWidth}px`,
    "--hero-title-size": `${desktop.titleSizePx}px`,
    "--hero-title-size-sm": `${desktop.titleSizePx}px`,
    "--hero-desc-size": `${desktop.descriptionSizePx}px`,
    "--hero-desc-size-sm": `${desktop.descriptionSizePx}px`,
    "--hero-title-color": desktop.titleColor,
    "--hero-title-color-sm": desktop.titleColor,
    "--hero-desc-color": desktop.descriptionColor,
    "--hero-desc-color-sm": desktop.descriptionColor,
    "--hero-text-align": desktop.textAlign,
    "--hero-text-align-sm": desktop.textAlign,
    "--hero-cta-justify": justify,
    "--hero-cta-justify-sm": justify,
  };
}

function responsiveOverlayFlexClasses(
  mobile: HeroSlideLayoutPreset,
  desktop: HeroSlideLayoutPreset,
): string {
  const classes = [anchorXClass[mobile.alignX], anchorYClass[mobile.alignY]];

  if (desktop.alignX !== mobile.alignX) {
    classes.push(anchorXClassSm[desktop.alignX]);
  }
  if (desktop.alignY !== mobile.alignY) {
    classes.push(anchorYClassSm[desktop.alignY]);
  }

  return classes.join(" ");
}

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
  isPrimaryHeading,
  hidden,
}: {
  copy: HeroCopy;
  isPrimaryHeading: boolean;
  hidden?: boolean;
}) {
  const HeadingTag = isPrimaryHeading ? "h1" : "h2";

  return (
    <div
      className={`${styles.copyPanel} pointer-events-auto relative z-20 w-full min-w-0`}
      aria-hidden={hidden || undefined}
    >
      {copy.badge ? (
        <p className={`${styles.copyBadge} mb-2 text-xs font-bold uppercase tracking-[0.2em] sm:text-sm`}>
          {copy.badge}
        </p>
      ) : null}
      <HeadingTag className={`${styles.copyTitle} font-bold leading-tight tracking-tight break-words`}>
        {copy.title}
      </HeadingTag>
      <p className={`${styles.copyDescription} mt-2 leading-relaxed sm:mt-4`}>{copy.description}</p>
      <div className={`${styles.copyCtaRow} mt-4 flex flex-wrap gap-2 sm:mt-6 sm:gap-3`}>
        {copy.shopBestSellersLabel.trim() && copy.shopBestSellersHref.trim() ? (
          <HeroNavLink
            href={copy.shopBestSellersHref}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex min-h-10 items-center bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover sm:min-h-11 sm:px-6 sm:py-3 sm:text-sm"
          >
            {copy.shopBestSellersLabel}
          </HeroNavLink>
        ) : null}
        {copy.wholesaleInquiryLabel.trim() && copy.wholesaleInquiryHref.trim() ? (
          <HeroNavLink
            href={copy.wholesaleInquiryHref}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex min-h-10 items-center border border-zinc-300 bg-white/90 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-800 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent sm:min-h-11 sm:px-6 sm:py-3 sm:text-sm"
          >
            {copy.wholesaleInquiryLabel}
          </HeroNavLink>
        ) : null}
      </div>
      <span className="sr-only">Hero banner content overlay</span>
    </div>
  );
}

function HeroSlideFrame({
  slide,
  defaultCopy,
  priority,
  preload,
  isActive,
}: {
  slide: HeroBannerSlide;
  defaultCopy: HeroCopy;
  priority?: boolean;
  preload?: boolean;
  isActive: boolean;
}) {
  const copy = mergeSlideCopy(defaultCopy, slide);
  const { desktop, mobile } = resolveHeroSlideLayout(slide.layout);
  const mobileImageSrc = slide.mobileSrc ?? slide.src;
  const imageAlt = `${slide.brandLabel} K-Beauty wholesale banner`;

  return (
    <div className="relative w-full min-h-[280px] bg-[#f4f2ef] sm:aspect-[1920/600]">
      <HeroNavLink
        href={slide.href}
        aria-label={slide.brandLabel}
        tabIndex={isActive ? undefined : -1}
        className="absolute inset-0 z-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-hidden={!isActive || undefined}
      >
        <HeroBannerImage
          src={slide.src}
          alt={imageAlt}
          priority={priority}
          preload={preload}
          imageFocus={desktop.imageFocus}
          className="hidden sm:block"
        />
        <HeroBannerImage
          src={mobileImageSrc}
          alt={imageAlt}
          priority={priority}
          preload={preload}
          imageFocus={slide.mobileSrc ? mobile.imageFocus : "center"}
          className="sm:hidden"
        />
      </HeroNavLink>

      <div className="hidden sm:block">
        <HeroGradientOverlay strength={desktop.gradientStrength} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 sm:hidden"
        style={{
          background: `linear-gradient(to top, rgba(255,255,255,${mobile.gradientStrength / 100}) 0%, rgba(255,255,255,${(mobile.gradientStrength / 100) * 0.35}) 45%, transparent 72%)`,
        }}
        aria-hidden
      />
      <div
        className={`${styles.copyOverlay} pointer-events-none absolute inset-0 z-10 flex min-w-0 px-3 sm:px-6 lg:px-10 ${responsiveOverlayFlexClasses(mobile, desktop)}`}
        style={buildHeroCopyCssVars(mobile, desktop)}
        aria-hidden={!isActive || undefined}
      >
        <HeroCopyPanel
          copy={copy}
          isPrimaryHeading={isActive}
          hidden={!isActive}
        />
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
    slides.slice(0, 2).forEach((slide) => {
      preloadImage(slide.src);
      if (slide.mobileSrc) {
        preloadImage(slide.mobileSrc);
      }
    });
  }, [slides]);

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }

    const nextIndex = (activeIndex + 1) % slideCount;
    const nextSlide = slides[nextIndex];
    if (!nextSlide) {
      return;
    }

    preloadImage(nextSlide.src);
    if (nextSlide.mobileSrc) {
      preloadImage(nextSlide.mobileSrc);
    }
  }, [activeIndex, slideCount, slides]);

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
          <div
            className="relative aspect-[1920/600] w-full bg-gradient-to-br from-slate-50 via-white to-rose-50/30"
            style={buildDesktopOnlyCopyCssVars(desktop)}
          >
            <HeroCopyPanel copy={copy} isPrimaryHeading />
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
              inert={showControls && index !== activeIndex ? true : undefined}
            >
              <HeroSlideFrame
                slide={slide}
                defaultCopy={copy}
                priority={index === 0}
                preload={index <= 1}
                isActive={!showControls || index === activeIndex}
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
