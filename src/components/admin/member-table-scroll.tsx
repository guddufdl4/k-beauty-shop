"use client";

import { useRef, type ReactNode } from "react";

export function MemberTableScroll({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }
  return (
    <div className="mt-4 min-w-0 max-w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <p>표를 좌우로 밀어 국가·회원 등급·사업자 증빙을 확인하세요.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} aria-controls="member-table-scroll" className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700">← 왼쪽 열</button>
          <button type="button" onClick={() => move(1)} aria-controls="member-table-scroll" className="min-h-10 rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700">오른쪽 열 →</button>
        </div>
      </div>
      <div ref={scrollRef} id="member-table-scroll" role="region" aria-label="회원 목록: 좌우 스크롤" tabIndex={0}
        className="w-full min-w-0 max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white focus-visible:outline-2 focus-visible:outline-violet-500"
        style={{ touchAction: "pan-x pan-y pinch-zoom", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </div>
  );
}
