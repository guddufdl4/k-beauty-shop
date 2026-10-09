"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Notification = { id: string; kind: string; title: string; detail: string; href: string; createdAt: string };
type Feed = { adminId: string; notifications: Notification[] };

export function AdminNotifications() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState("");
  const previous = useRef<Set<string> | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const unread = feed?.notifications.filter(item => !read.includes(item.id)) ?? [];

  useEffect(() => {
    let stopped = false;
    let active: AbortController | null = null;
    let lastRefresh = 0;
    async function refresh() {
      if (document.hidden || active || Date.now() - lastRefresh < 15000) return;
      lastRefresh = Date.now();
      active = new AbortController();
      try {
        const response = await fetch("/api/admin/notifications", { cache: "no-store", signal: active.signal });
        if (!response.ok) throw new Error("Unavailable");
        const next: Feed = await response.json();
        if (stopped) return;
        let saved: string[] = [];
        try {
          const value = JSON.parse(localStorage.getItem(`hmt-admin-notifications:${next.adminId}`) || "[]");
          if (Array.isArray(value)) saved = value.filter((id): id is string => typeof id === "string");
        } catch { /* Reading alerts still works if browser storage is unavailable. */ }
        const fresh = next.notifications.filter(item => !saved.includes(item.id) && (!previous.current || !previous.current.has(item.id)));
        if (fresh.length) setToast(previous.current ? `새 알림 ${fresh.length}건이 도착했습니다.` : `확인하지 않은 알림 ${fresh.length}건이 있습니다.`);
        previous.current = new Set(next.notifications.map(item => item.id));
        setFeed(next);
        setRead(saved);
        setError(false);
      } catch {
        if (!stopped) setError(true);
      } finally { active = null; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const resume = () => void refresh();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => { stopped = true; active?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  function markRead(ids: string[]) {
    const next = Array.from(new Set([...read, ...ids])).slice(-2000);
    setRead(next);
    if (feed) try { localStorage.setItem(`hmt-admin-notifications:${feed.adminId}`, JSON.stringify(next)); } catch { /* Keep the current view usable. */ }
  }

  return <div ref={panel} className="relative shrink-0">
    <button type="button" aria-label={`관리자 알림 ${unread.length}건`} aria-expanded={open} onClick={() => { setOpen(!open); setToast(""); }} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100">
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {unread.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold leading-5 text-white">{unread.length > 99 ? "99+" : unread.length}</span>}
    </button>
    {open && <section aria-label="관리자 알림 목록" className="fixed inset-x-4 top-28 z-[100] rounded-2xl border border-violet-100 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96">
      <div className="flex items-center justify-between border-b border-zinc-100 p-4"><h2 className="font-bold text-zinc-900">관리자 알림 <span className="text-violet-700">{unread.length}</span></h2><button type="button" disabled={!unread.length} onClick={() => markRead(feed?.notifications.map(item => item.id) ?? [])} className="text-xs font-semibold text-violet-700 disabled:text-zinc-400">모두 읽음</button></div>
      <p className="px-4 py-2 text-xs text-zinc-500">최근 7일 · 회원/주문 각각 최신 100건 · 30초마다 갱신</p>
      {error && <p role="status" className="px-4 py-3 text-sm text-rose-700">알림을 갱신하지 못했습니다. 잠시 후 다시 확인합니다.</p>}
      {!feed && !error && <p className="p-5 text-sm text-zinc-500">알림을 불러오는 중입니다.</p>}
      {feed && !feed.notifications.length && <p className="p-5 text-sm text-zinc-500">최근 알림이 없습니다.</p>}
      <ul className="max-h-[min(55vh,28rem)] overflow-y-auto">{feed?.notifications.map(item => <li key={item.id}><Link prefetch={false} href={item.href} onClick={() => { markRead([item.id]); setOpen(false); }} className={`block border-t border-zinc-100 px-4 py-3 hover:bg-violet-50 ${read.includes(item.id) ? "bg-white" : "bg-violet-50/60"}`}><p className="text-sm font-semibold text-zinc-900">{!read.includes(item.id) && <span aria-label="읽지 않음" className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500" />}{item.title}</p><p className="mt-1 break-words text-sm text-zinc-600">{item.detail}</p><time className="mt-1 block text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)</time></Link></li>)}</ul>
      <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">읽음 표시는 현재 브라우저의 관리자 계정별로 저장됩니다.</p>
    </section>}
    {toast && !open && <div role="status" className="fixed bottom-5 right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-2xl bg-zinc-900 px-5 py-4 text-sm text-white shadow-xl"><button type="button" onClick={() => { setOpen(true); setToast(""); }}>{toast} <span className="ml-2 text-pink-300">확인 →</span></button><button type="button" aria-label="알림 안내 닫기" onClick={() => setToast("")}>×</button></div>}
  </div>;
}
