import { requireInquiryManagementSession } from "@/lib/supabase/auth-helpers";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireInquiryManagementSession();
  return children;
}
