"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/settings", label: "일반 설정" },
  { href: "/admin/settings/hero", label: "메인 배너" },
] as const;

export function AdminSettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-rose-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}