import { requireAdminSession } from "@/lib/supabase/auth-helpers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return <div className="min-h-screen bg-zinc-100">{children}</div>;
}
