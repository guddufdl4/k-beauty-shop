"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
export type AdminNavItem = { href: string; label: string };
const paths: Record<string,string> = {
  '/admin': 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  '/admin/members': 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a8 8 0 0 1 16 0v3',
  '/admin/inquiries': 'M4 3h16v14H9l-5 4ZM8 8h8M8 12h5',
  '/admin/orders': 'M3 4h2l3 13h11l2-9H6M10 21h.01M18 21h.01',
  '/admin/products': 'm12 3 9 5v9l-9 5-9-5V8Zm0 9 9-4M12 12 3 8M12 12v10',
  '/admin/settings': 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
};
function Icon({href}:{href:string}) { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[href] || paths['/admin']} /></svg>; }
export function AdminNavigation({items}:{items:AdminNavItem[]}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const active = (href:string) => href === '/admin' ? pathname === href : pathname.startsWith(href);
  const link = (item:AdminNavItem) => <Link key={item.href} href={item.href} prefetch={false} aria-current={active(item.href) ? 'page' : undefined} onClick={()=>menu.current?.removeAttribute('open')} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium ${active(item.href) ? 'bg-violet-50 text-violet-700' : 'text-zinc-600 hover:bg-zinc-50'}`}><Icon href={item.href}/>{item.label}</Link>;
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-52 flex-col border-r border-zinc-100 bg-white px-3 py-8 lg:flex"><Link href="/admin" className="mb-10 px-4 text-xl font-extrabold tracking-tight"><span className="text-pink-500">HMT</span> KOREA</Link><nav aria-label="관리자 메뉴" className="space-y-2">{items.map(link)}</nav><p className="mt-auto px-4 text-xs leading-6 text-zinc-400">HMT KOREA<br/>관리자 센터</p></aside>
    <details ref={menu} className="relative lg:hidden"><summary aria-label="관리자 전체 메뉴" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold text-violet-700"><span aria-hidden="true">☰</span> 관리 메뉴</summary><nav aria-label="모바일 전체 관리자 메뉴" className="absolute left-0 top-full z-50 mt-2 w-56 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">{items.map(link)}</nav></details>
    <nav aria-label="모바일 관리자 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">{items.filter(item=>['/admin','/admin/members','/admin/inquiries'].includes(item.href)).map(item=><Link key={item.href} href={item.href} prefetch={false} aria-current={active(item.href)?'page':undefined} className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${active(item.href)?'font-semibold text-violet-700':'text-zinc-500'}`}><Icon href={item.href}/>{item.label}</Link>)}</nav>
  </>;
}
