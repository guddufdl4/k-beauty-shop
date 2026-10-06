"use server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
export async function changeInquiryTrash(form: FormData) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return { error: "관리자 권한이 필요합니다." };
  const id = String(form.get("id")), type = String(form.get("type")), decision = String(form.get("decision"));
  const tables: Record<string,string> = { support: "support_inquiries", import: "import_inquiries", wholesale: "wholesale_inquiries" };
  if (!tables[type] || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["delete","restore"].includes(decision)) return { error: "잘못된 요청입니다." };
  const client = createServiceClient();
  if (!client) return { error: "문의 정보를 저장할 수 없습니다." };
  let query = client.from(tables[type]).update({ deleted_at: decision === "delete" ? new Date().toISOString() : null }).eq("id",id);
  query = decision === "delete" ? query.is("deleted_at",null) : query.not("deleted_at","is",null);
  const result = await query.select("id");
  if (result.error || !result.data?.length) return { error: "변경하지 못했습니다. 새로고침 후 다시 시도해 주세요." };
  revalidatePath("/admin/inquiries");
  return { success: decision === "delete" ? "삭제 보관함으로 이동했습니다." : "문의를 복원했습니다." };
}
