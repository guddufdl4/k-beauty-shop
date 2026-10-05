"use client";

import { useState } from "react";

export function SignupPolicyPreview({ id, title, paragraphs }: {
  id: string; title: string; paragraphs: string[];
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || focused || pinned;
  return <div className="inline-block max-w-full align-top"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") { setHovered(false); setFocused(false); setPinned(false); } }}>
    <button type="button" aria-expanded={open} aria-controls={id}
      onClick={() => { setPinned(!pinned); setFocused(false); setHovered(false); }}
      className="font-medium text-violet-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-700">{title}</button>
    <section id={id} aria-label={title} hidden={!open}
      className="mt-3 max-h-72 w-full overflow-y-auto rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm leading-6 text-zinc-700">
      <h3 className="mb-3 font-semibold text-zinc-900">{title}</h3>
      {paragraphs.filter(Boolean).map((text, index) => <p key={index} className="mb-3 whitespace-pre-line last:mb-0">{text}</p>)}
    </section>
  </div>;
}
