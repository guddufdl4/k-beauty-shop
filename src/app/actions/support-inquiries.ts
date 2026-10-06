"use server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
export async function updateSupportInquiry(form: FormData) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return { error: "관리자 권한이 필요합니다." };
  const id = String(form.get("id"));
  const decision = String(form.get("decision"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["viewed", "resolve", "reopen"].includes(decision)) return { error: "잘못된 요청입니다." };
  const client = createServiceClient();
  if (!client) return { error: "문의를 저장할 수 없습니다." };
  const now = new Date().toISOString();
  const patch = decision === "viewed" ? { viewed_at: now } : { resolved_at: decision === "resolve" ? now : null };
  let query = client.from("support_inquiries").update(patch).eq("id", id);
  if (decision === "viewed") query = query.is("viewed_at", null);
  const result = await query.select("id");
  if (result.error) return { error: "변경하지 못했습니다. 다시 시도해 주세요." };
  if (!result.data?.length) return { error: "이미 확인되었거나 찾을 수 없는 문의입니다." };
  revalidatePath("/admin/inquiries");
  return { success: "문의 상태를 변경했습니다." };
}
