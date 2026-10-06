import { requireAdminSession } from "@/lib/supabase/auth-helpers";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return children;
}
