import { canManageInquiries } from "@/lib/auth/member-access";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import Link from "next/link";
import { AdminNotifications } from "./admin-notifications";
import { AdminNavigation } from "./admin-navigation";
import { storefrontHref } from "@/lib/store/storefront-href";
import "./admin-theme.css";

const navLinks = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/inquiries", label: "문의 관리" },
  { href: "/admin/orders", label: "주문 관리" },
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/settings", label: "사이트 설정" },
];
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();
  const isAdmin = profile?.role === "admin";
  const items = navLinks.filter(item => isAdmin || item.href === "/admin" || item.href === "/admin/members" || (item.href === "/admin/inquiries" && canManageInquiries(profile)));
  return <div className="hmt-admin min-h-screen bg-[#f6f7fb] lg:pl-52">
    <header className="flex min-h-20 items-center justify-between gap-3 border-b border-zinc-100 bg-white px-4 lg:justify-end lg:bg-transparent lg:px-8">
      <AdminNavigation items={items}/>
      <div className="flex items-center gap-3">{isAdmin ? <AdminNotifications/> : null}<span className="hidden text-sm font-medium text-zinc-600 sm:inline">{isAdmin ? '관리자' : '회원관리 담당자'}</span><Link href={storefrontHref()} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600">스토어 홈 ↗</Link></div>
    </header>
    <div className="min-w-0 pb-24 md:pb-0">{children}</div>
  </div>;
}
