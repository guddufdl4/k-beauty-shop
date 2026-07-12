import Link from "next/link";
import { storefrontHref } from "@/lib/store/storefront-href";

const navLinks = [
  { href: "/admin", label: "\ub300\uc2dc\ubcf4\ub4dc" },
  { href: "/admin/orders", label: "\uc8fc\ubb38 \uad00\ub9ac" },
  { href: "/admin/products", label: "\uc0c1\ud488 \uad00\ub9ac" },
  { href: "/admin/settings", label: "\uc0ac\uc774\ud2b8 \uc124\uc815" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-center gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={storefrontHref()}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            {"\u2190 \uc2a4\ud130 \ud648"}
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}