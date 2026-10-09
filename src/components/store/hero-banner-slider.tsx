"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Link } from "@/i18n/navigation";
import NextImage from "next/image";

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
  products?: { id: string; name: string; brand: string; src: string; href: string }[];
  id: string;
  src: string;
  mobileSrc?: string;
  href: string;
  brandLabel: string;
  layout?: import("@/lib/admin/hero-image-spec").HeroSlideLayout;
  copy?: Partial<HeroCopy>;
  imageFit?: "contain" | "cover";
  imageWidth?: number;
  imageHeight?: number;
};

export type HeroCopy = {
  badge?: string | null;
  title: string;
  description: string;
  shopBestSellersLabel: string;
  shopBestSellersHref: string;
  wholesaleInquiryLabel: string;
  wholesaleInquiryHref: string;
  orderGuideLabel: string;
  orderGuideHref: string;
};

type Props = {
  slides: HeroBannerSlide[];
  copy: HeroCopy;
};

const AUTOPLAY_MS = 5500;

function mergeCopyLabel(override: string | undefined, fallback: string): string {
  return override !== undefined ? override.trim() : fallback;
}

function mergeCopyHref(override: string | undefined, fallback: string): string {
  if (override === undefined) {
    return fallback;
  }

  return override.trim() || fallback;
}

function mergeSlideCopy(defaultCopy: HeroCopy, slide: HeroBannerSlide): HeroCopy {
  const override = slide.copy;
  if (!override) {
    return defaultCopy;
  }

  return {
    badge: override.badge !== undefined ? override.badge : defaultCopy.badge,
    title: override.title !== undefined ? override.title.trim() : defaultCopy.title,
    description:
      override.description !== undefined ? override.description.trim() : defaultCopy.description,
    shopBestSellersLabel: mergeCopyLabel(
      override.shopBestSellersLabel,
      defaultCopy.shopBestSellersLabel,
    ),
    shopBestSellersHref: mergeCopyHref(
      override.shopBestSellersHref,
      defaultCopy.shopBestSellersHref,
    ),
    wholesaleInquiryLabel: mergeCopyLabel(
      override.wholesaleInquiryLabel,
      defaultCopy.wholesaleInquiryLabel,
    ),
    wholesaleInquiryHref: mergeCopyHref(
      override.wholesaleInquiryHref,
      defaultCopy.wholesaleInquiryHref,
    ),
    orderGuideLabel: mergeCopyLabel(override.orderGuideLabel, defaultCopy.orderGuideLabel),
    orderGuideHref: mergeCopyHref(override.orderGuideHref, defaultCopy.orderGuideHref),
  };
}

function stopCarouselPointer(event: PointerEvent<HTMLElement>) {
  event.stopPropagation();
}

function isCarouselInteractiveTarget(target: EventTarget | null): boolean {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(element?.closest("a[href], button"));
}

function HeroNavLink({
  href,
  children,
  className,
  tabIndex,
  isolatePointer,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
  tabIndex?: number;
  isolatePointer?: boolean;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  const onPointerDown = isolatePointer ? stopCarouselPointer : undefined;

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
        onPointerDown={onPointerDown}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      prefetch={false}
      href={href}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden || undefined}
      className={className}
      onPointerDown={onPointerDown}
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
  const campaignLogo = ({"Dr.Althea":"dralthea-verified.png", "Beauty of Joseon":"beauty-of-joseon-verified.png", "ANUA":"anua.svg", "SKIN1004":"skin1004-verified.png"} as Record<string,string>)[copy.badge ?? ""];
  const HeadingTag = isPrimaryHeading ? "h1" : "h2";

  return (
    <div
      className={`${styles.copyPanel} pointer-events-auto relative z-20 w-full min-w-0`}
      aria-hidden={hidden || undefined}
      onPointerDown={stopCarouselPointer}
    >
      {campaignLogo ? <p className="campaign-wordmark-text" data-brand={copy.badge}>{copy.badge}</p> : copy.badge ? (
        <p className={`${styles.copyBadge} mb-2 text-[13px] font-extrabold uppercase tracking-wide sm:text-[17px] sm:mb-3`}>
          {copy.badge}
        </p>
      ) : null}
      {copy.title.trim() ? (
        <HeadingTag className={`${styles.copyTitle} font-black leading-[1.08] tracking-tight break-words`}>
          {copy.title}
        </HeadingTag>
      ) : null}
      {copy.description.trim() ? (
        <p className={`${styles.copyDescription} mt-2 leading-relaxed sm:mt-3`}>{copy.description}</p>
      ) : null}
      <div
        className={`${styles.copyCtaRow} flex flex-wrap gap-2 sm:gap-3${
          copy.badge || copy.title.trim() || copy.description.trim() ? " mt-4 sm:mt-5" : ""
        }`}
      >
        {copy.shopBestSellersLabel.trim() && copy.shopBestSellersHref.trim() ? (
          <HeroNavLink
            href={copy.shopBestSellersHref}
            isolatePointer
            tabIndex={hidden ? -1 : undefined}
            className="relative z-20 inline-flex min-h-10 pointer-events-auto items-center rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover sm:min-h-11 sm:px-6 sm:py-3 sm:text-sm"
          >
            {copy.shopBestSellersLabel}
          </HeroNavLink>
        ) : null}
        {copy.wholesaleInquiryLabel.trim() && copy.wholesaleInquiryHref.trim() ? (
          <HeroNavLink
            href={copy.wholesaleInquiryHref}
            isolatePointer
            tabIndex={hidden ? -1 : undefined}
            className="relative z-20 inline-flex min-h-10 pointer-events-auto items-center border border-zinc-300 bg-white/90 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-800 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent sm:min-h-11 sm:px-6 sm:py-3 sm:text-sm"
          >
            {copy.wholesaleInquiryLabel}
          </HeroNavLink>
        ) : null}
        {copy.orderGuideLabel.trim() && copy.orderGuideHref.trim() ? (
          <HeroNavLink
            href={copy.orderGuideHref}
            isolatePointer
            tabIndex={hidden ? -1 : undefined}
            className="relative z-20 inline-flex min-h-10 pointer-events-auto items-center border-2 border-accent bg-white/90 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-accent backdrop-blur-sm transition-colors hover:bg-accent hover:text-white sm:min-h-11 sm:px-6 sm:py-3 sm:text-sm"
          >
            {copy.orderGuideLabel}
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
  isPrimaryHeading,
}: {
  slide: HeroBannerSlide;
  defaultCopy: HeroCopy;
  priority?: boolean;
  preload?: boolean;
  isActive: boolean;
  isPrimaryHeading: boolean;
}) {
  const copy = mergeSlideCopy(defaultCopy, slide);
  const { desktop, mobile } = resolveHeroSlideLayout(slide.layout);
  const mobileImageSrc = slide.mobileSrc ?? slide.src;
  const imageAlt = slide.brandLabel.trim() || "HMT KOREA";

  if (slide.products?.length) {
    return (
      <div className="relative isolate grid w-full min-w-0 h-[530px] grid-rows-[270px_260px] overflow-hidden bg-gradient-to-br from-[#fff7fa] via-[#fbe5ee] to-[#f5e9ff] sm:h-[370px] sm:grid-rows-1 sm:grid-cols-[44%_56%] lg:h-[470px]">
        <NextImage src="/hero/pink-world-blossom-v1.webp" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" priority={priority} className="pointer-events-none object-cover object-right" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#fff2f7]/80 via-[#fff2f7]/25 to-transparent" />
        <div className="relative z-20 flex min-w-0 flex-col justify-center px-10 pb-0 pt-4 sm:px-12 sm:py-12 lg:pl-16">
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-[#e11d73]">{copy.badge}</p>
          {isPrimaryHeading ? <h1 className="text-3xl font-bold leading-[1.08] tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">{copy.title}</h1>
            : <h2 className="text-3xl font-bold leading-[1.08] tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">{copy.title}</h2>}
          <p className="mt-3 max-w-sm sm:mt-5 text-sm leading-6 text-zinc-600 lg:text-base">{copy.description}</p>
          <HeroNavLink href={copy.orderGuideHref || slide.href} tabIndex={isActive ? undefined : -1}
            className="mt-4 w-fit sm:mt-6 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-accent-hover">
            {copy.orderGuideLabel || copy.shopBestSellersLabel}
          </HeroNavLink>
        </div>
        <div className="relative z-10 flex min-w-0 items-center justify-center px-7 pb-10 pt-2 sm:pb-12 sm:pt-7 sm:pl-2 sm:pr-12 lg:pr-16">
          <div className="grid w-full min-w-0 max-w-[640px] grid-cols-6 items-end gap-3 sm:gap-4">
            {slide.products.map((product, index) => (
              <Link key={product.id} href={product.href} prefetch={false} tabIndex={isActive ? undefined : -1} aria-label={product.name}
                className={`group relative col-span-2 min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-white p-2 shadow-[0_16px_35px_-20px_rgba(110,35,75,0.4)] transition hover:-translate-y-1 ${index === 3 ? "col-start-2" : ""} ${index === 1 ? "-translate-y-3" : ""}`}>
                <div className="relative aspect-square"><NextImage src={product.src} alt={product.name} fill sizes="(max-width: 640px) 110px, 180px" priority={priority} className="object-contain p-1 transition group-hover:scale-105" /></div>
                <p className="truncate px-1 pb-1 text-center text-[10px] font-bold tracking-wide text-zinc-700 sm:text-xs">{product.brand}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[530px] bg-[#f4f2ef] sm:h-[370px] lg:h-[470px]">
      {slide.id.startsWith("seasonal-") && slide.mobileSrc ? (
        <picture>
          <source media="(min-width: 640px)" srcSet={slide.src} />
          {/* Campaign assets are already optimized WebP; picture downloads only the matching device image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.mobileSrc} alt={imageAlt} width={750} height={938}
            loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        </picture>
      ) : <>
      <HeroBannerImage
        src={slide.src}
        alt={imageAlt}
        priority={priority}
        preload={preload}
        imageFocus={desktop.imageFocus}
        objectFit={slide.imageFit}
        width={slide.imageWidth}
        height={slide.imageHeight}
        className="pointer-events-none hidden sm:block"
      />
      <HeroBannerImage
        src={mobileImageSrc}
        alt={imageAlt}
        priority={priority}
        preload={preload}
        imageFocus={slide.mobileSrc ? mobile.imageFocus : "center"}
        objectFit={slide.imageFit}
        width={slide.imageWidth}
        height={slide.imageHeight}
        className="pointer-events-none sm:hidden"
      />
      </>}
      <HeroNavLink
        href={slide.href}
        aria-label={slide.brandLabel}
        tabIndex={isActive ? undefined : -1}
        className="absolute inset-0 z-[1] block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-hidden={!isActive || undefined}
      >
        <span className="sr-only">{slide.brandLabel}</span>
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
        className={`${styles.copyOverlay} pointer-events-none absolute inset-0 z-20 flex min-w-0 px-3 sm:px-6 lg:px-10 ${responsiveOverlayFlexClasses(mobile, desktop)}`}
        style={buildHeroCopyCssVars(mobile, desktop)}
        aria-hidden={!isActive || undefined}
      >
        <HeroCopyPanel
          copy={copy}
          isPrimaryHeading={isPrimaryHeading}
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
  useEffect(() => {
    const brand = slides[activeIndex]?.copy?.badge;
    if (brand) window.dispatchEvent(new CustomEvent("hmt:campaign-brand", {detail:brand}));
  }, [activeIndex, slides]);
  const activeIndexRef = useRef(0);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  useEffect(() => { const pause = () => setAutoplayPaused(true); window.addEventListener("hmt:pause-campaign",pause); return () => window.removeEventListener("hmt:pause-campaign",pause); }, []);
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
      if (activeIndexRef.current !== nextIndex) {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
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
      if (document.hidden || !sectionRef.current) return;
      const bounds = sectionRef.current.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
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

      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
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
      className="campaign-hero border-b border-zinc-200 bg-white outline-none"
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
          style={showControls ? { cursor: "grab", touchAction: "pan-x pan-y pinch-zoom" } : undefined}
          onPointerDown={
            showControls
              ? (event) => {
                  if (event.pointerType !== "mouse" || isCarouselInteractiveTarget(event.target)) {
                    return;
                  }

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
              className={showControls ? "w-full min-w-0 shrink-0 snap-center snap-always" : "w-full"}
              aria-hidden={showControls && index !== activeIndex ? true : undefined}
              inert={showControls && index !== activeIndex ? true : undefined}
            >
              <HeroSlideFrame
                slide={slide}
                defaultCopy={copy}
                priority={index === 0}
                preload={index === 0}
                isActive={!showControls || index === activeIndex}
                isPrimaryHeading={index === 0}
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
              className="absolute left-2 bottom-3 z-30 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:left-4"
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
              className="absolute right-2 bottom-3 z-30 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-4"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 hidden justify-center sm:flex gap-1 sm:bottom-4 sm:gap-2">
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
        {showControls && slides.some((slide) => slide.id.startsWith("seasonal-")) ? (
          <div className="grid grid-cols-2 gap-1 border-t border-zinc-100 pt-2 sm:grid-cols-4 sm:gap-3" aria-label="Campaign brands">
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" aria-pressed={index === activeIndex}
                onClick={() => { pauseAutoplay(); scrollToIndex(index); }}
                className={`min-h-11 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${index === activeIndex ? "bg-rose-50 text-accent" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}>
                {slide.copy?.badge || slide.brandLabel}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
