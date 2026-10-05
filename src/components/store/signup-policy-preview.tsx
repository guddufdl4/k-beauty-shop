"use client";

import { useEffect, useRef, useState } from "react";

export function SignupPolicyPreview({ id, title, paragraphs }: {
  id: string; title: string; paragraphs: string[];
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const cancelTimer = () => { if (timer.current) clearTimeout(timer.current); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        if (timer.current) clearTimeout(timer.current);
        setHovered(false); setFocused(false); setPinned(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const open = hovered || focused || pinned;
  return <div ref={root} className={`relative inline-block max-w-full align-top ${open ? "z-40" : "z-0"}`}
    onMouseEnter={() => { cancelTimer(); timer.current = setTimeout(() => setHovered(true), 220); }}
    onMouseLeave={() => { cancelTimer(); timer.current = setTimeout(() => setHovered(false), 180); }}
    onFocus={(event) => { if (event.target.matches(":focus-visible")) setFocused(true); }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") { cancelTimer(); setHovered(false); setFocused(false); setPinned(false); } }}>
    <button type="button" aria-expanded={open} aria-controls={id}
      onClick={() => { cancelTimer(); setPinned(!pinned); setFocused(false); setHovered(false); }}
      className="font-medium text-violet-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-700">{title}</button>
    <div hidden={!open} className="absolute left-0 top-full w-[min(32rem,calc(100vw-5rem))] pt-2">
    <section id={id} aria-label={title}
      className="max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-violet-200 bg-white p-4 text-sm leading-6 text-zinc-700 shadow-xl shadow-violet-950/10">
      <h3 className="mb-3 font-semibold text-zinc-900">{title}</h3>
      {paragraphs.filter(Boolean).map((text, index) => <p key={index} className="mb-3 whitespace-pre-line last:mb-0">{text}</p>)}
    </section>
    </div>
  </div>;
}
