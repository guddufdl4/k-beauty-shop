"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeroBannerImage } from "@/components/store/hero-banner-image";

export type HeroBannerSlide = {
  id: string;
  src: string;
};

type Props = {
  slides: HeroBannerSlide[];
};

export function HeroBannerSlider({ slides }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const slideCount = slides.length;
  const showControls = slideCount > 1;

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
      setActiveIndex(Math.min(Math.max(index, 0), slideCount - 1));
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [showControls, slideCount]);

  const scrollToIndex = useCallback((index: number) => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  }, []);

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

  if (slideCount === 0) {
    return null;
  }

  const track = (
    <div
      ref={showControls ? containerRef : undefined}
      className={
        showControls
          ? "flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : undefined
      }
      style={showControls ? { cursor: "grab", touchAction: "pan-x" } : undefined}
      onPointerDown={
        showControls
          ? (event) => {
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
    >
      {slides.map((slide) => (
        <div
          key={slide.id}
          className={showControls ? "w-full shrink-0 snap-center snap-always" : "w-full"}
        >
          <HeroBannerImage src={slide.src} />
        </div>
      ))}
    </div>
  );

  return (
    <section className="group relative overflow-hidden border-b border-zinc-200 bg-slate-100">
      {track}

      {showControls ? (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => scrollToIndex(activeIndex <= 0 ? slideCount - 1 : activeIndex - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-zinc-700 shadow-sm transition hover:bg-white sm:block"
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
            onClick={() => scrollToIndex(activeIndex >= slideCount - 1 ? 0 : activeIndex + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-zinc-700 shadow-sm transition hover:bg-white sm:block"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Banner ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => scrollToIndex(index)}
                className={`h-2 w-2 rounded-full transition ${
                  index === activeIndex ? "bg-zinc-800" : "bg-zinc-400/80 hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
