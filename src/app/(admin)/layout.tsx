import { AdminShell } from "@/components/admin/admin-shell";
import { requireMemberManagementSession } from "@/lib/supabase/auth-helpers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMemberManagementSession();

  return <AdminShell>{children}</AdminShell>;
}