import { requireMemberManagementSession } from "@/lib/supabase/auth-helpers";
import { BusinessLookupForm } from "@/components/admin/business-lookup-form";

export default async function BusinessLookupPage() {
  await requireMemberManagementSession();
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <h1 className="text-2xl font-bold">사업자 조회</h1>
    <p className="mt-2 text-sm leading-6 text-zinc-600">사업자 번호로 등록 상태를 확인하고 제출 서류와 비교하세요. 조회는 회원 승인 상태를 변경하지 않습니다.</p>
    <BusinessLookupForm configured={Boolean(process.env.NTS_API_KEY?.trim())} />
  </main>;
}
