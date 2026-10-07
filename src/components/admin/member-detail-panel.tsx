"use client";

import { useRef, useState, type ReactNode } from "react";

export function MemberDetailPanel({ name, children }: { name: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  return <>
    <button type="button" aria-label={`${name} 회원 상세`} onClick={() => { setOpened(true); dialog.current?.showModal(); }} className="min-h-11 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-violet-700 hover:border-violet-300">상세 보기</button>
    <dialog ref={dialog} onClose={() => setOpened(false)} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(28rem,100vw)] max-w-none overflow-y-auto border-0 bg-white p-0 shadow-2xl backdrop:bg-zinc-900/30">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4"><h2 className="text-lg font-bold">회원 상세</h2><button type="button" aria-label="회원 상세 닫기" onClick={() => dialog.current?.close()} className="min-h-11 rounded-xl px-4 text-sm text-zinc-600">닫기 ×</button></div>
      {opened ? <div className="space-y-5 p-6">{children}</div> : null}
    </dialog>
  </>;
}
