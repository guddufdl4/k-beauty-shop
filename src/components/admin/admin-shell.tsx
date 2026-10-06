import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import Link from "next/link";
import { AdminNotifications } from "./admin-notifications";
import { storefrontHref } from "@/lib/store/storefront-href";

const navLinks = [
  { href: "/admin/inquiries", label: "문의 관리" },
  { href: "/admin", label: "\ub300\uc2dc\ubcf4\ub4dc" },
  { href: "/admin/members", label: "\ud68c\uc6d0" },
  { href: "/admin/orders", label: "\uc8fc\ubb38 \uad00\ub9ac" },
  { href: "/admin/products", label: "\uc0c1\ud488 \uad00\ub9ac" },
  { href: "/admin/settings", label: "\uc0ac\uc774\ud2b8 \uc124\uc815" },
] as const;

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();
  const isAdmin = profile?.role === "admin";
  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-center gap-2">
            {navLinks.filter((item) => isAdmin || item.href === "/admin" || item.href === "/admin/members").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">{isAdmin ? <AdminNotifications /> : null}<Link
            href={storefrontHref()}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            {"\u2190 \uc2a4\ud130 \ud648"}
          </Link></div>
        </div>
      </header>
      {children}
    </div>
  );
}
