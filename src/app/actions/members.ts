"use server";
import { revalidatePath } from "next/cache";
import { canManageMembers } from "@/lib/auth/member-access";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function setBusinessApproval(formData: FormData) {
  const session = await getSessionProfile();
  if (!session.user || !canManageMembers(session.profile)) throw new Error("Member management access required");
  const rawIds = formData.getAll("member_id").map(String);
  if (rawIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error("Invalid member selection");
  const ids = [...new Set(rawIds)];
  const decision = String(formData.get("decision"));
  if (!ids.length || ids.length > 2000 || !["approve", "revoke", "grade"].includes(decision)) throw new Error("Invalid member selection");
  const grade = String(formData.get("grade"));
  const isAdmin = session.profile?.role === "admin";
  if (decision === "grade" && (!["normal", "vip", "members"].includes(grade) || (grade === "members" && !isAdmin))) throw new Error("Invalid grade");
  const client = createServiceClient();
  if (!client) throw new Error("Service unavailable");
  if (decision === "approve") {
    const proof = await client.from("business_documents").select("user_id,file_path,business_number").in("user_id",ids);
    if (proof.error) throw new Error("증빙 정보를 확인할 수 없습니다.");
    const eligible = new Set((proof.data || []).filter(row => row.file_path && row.business_number).map(row => row.user_id));
    if (ids.some(id => !eligible.has(id))) throw new Error("사업자 증빙을 제출하지 않은 회원이 포함돼 있습니다. 증빙 제출 회원만 선택해 주세요.");
  }
  const patch = decision === "grade"
    ? grade === "members" ? { staff_scope: "members" } : { member_grade: grade, ...(isAdmin ? { staff_scope: "none" } : {}) }
    : { role: decision === "approve" ? "wholesale" : "customer" };
  let query = client.from("profiles").update(patch).in("id", ids).neq("role", "admin");
  // Filter in the mutation itself: crafted requests cannot edit a staff or admin target.
  if (!isAdmin) query = query.eq("staff_scope", "none");
  const { data, error } = await query.select("id");
  if (error) throw new Error("Could not update member access");
  revalidatePath("/admin/members");
  revalidatePath("/", "layout");
  return { updated: data?.length ?? 0 };
}
