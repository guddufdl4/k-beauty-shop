"use server";
import { revalidatePath } from "next/cache";
import { canManageMembers } from "@/lib/auth/member-access";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import {canManageMemberTarget} from "@/lib/auth/member-access";
import {COUNTRY_REGIONS} from "@/lib/auth/country-regions";
import {validBusinessNumber} from "@/lib/auth/business-number";
import {parsePhoneNumberFromString} from "libphonenumber-js/max";

export async function editMemberProfile(form:FormData):Promise<{error?:string;success?:string}>{
 const session=await getSessionProfile();if(!session.user||!canManageMembers(session.profile))return {error:"회원 관리 권한이 필요합니다."};
 const id=String(form.get("member_id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))return {error:"회원 선택이 올바르지 않습니다."};
 const client=createServiceClient();if(!client)return {error:"잠시 후 다시 시도해 주세요."};
 const {data:target,error}=await client.from("profiles").select("role,staff_scope,business_number").eq("id",id).maybeSingle();
 if(error||!target||!canManageMemberTarget(session.profile,target))return {error:"이 회원을 수정할 권한이 없습니다."};
 const name=String(form.get("full_name")||"").trim(),company=String(form.get("company_name")||"").trim(),country=String(form.get("country_code")||""),phone=String(form.get("phone_number")||"").trim(),number=String(form.get("business_number")||"").trim();
 if([name,company].some(v=>v&&!/\p{L}/u.test(v)||/[<>\p{Cc}]/u.test(v))||name.length>80||company.length>200)return {error:"이름과 회사 정보를 확인해 주세요."};
 if(country&&!COUNTRY_REGIONS.some(c=>c.code===country))return {error:"국가를 선택해 주세요."};
 const parsedPhone=phone?parsePhoneNumberFromString(phone):null;if(phone&&!parsedPhone?.isValid())return {error:"국가번호가 포함된 올바른 휴대폰 번호를 입력해 주세요."};
 if(number&&!validBusinessNumber(number))return {error:"사업자 번호를 확인해 주세요."};
 // Changing the number requires renewed review; never grant price access through profile editing.
 const numberChanged=number!==(target.business_number||"");
 let update=client.from("profiles").update({full_name:name||null,company_name:company||null,country_code:country||null,business_number:number||null,...(numberChanged?{role:"customer"}:{})}).eq("id",id).neq("role","admin");
 if(session.profile?.role!=="admin")update=update.eq("staff_scope","none");
 const result=await update.select("id");if(result.error||!result.data?.length)return {error:"저장하지 못했습니다. 다시 시도해 주세요."};
 const phoneUpdate=await client.auth.admin.updateUserById(id,{user_metadata:{phone_number:parsedPhone?.number||null}});
 if(phoneUpdate.error){revalidatePath("/admin/members");return {error:"기본 정보는 저장했지만 휴대폰 번호는 저장하지 못했습니다. 다시 시도해 주세요."};}
 revalidatePath("/admin/members");revalidatePath(`/admin/members/${id}`);revalidatePath("/","layout");return {success:"회원 정보를 저장했습니다."};
}

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
  if (decision === "approve" && !isAdmin) {
    const proof = await client.from("business_documents").select("user_id,file_path,business_number").in("user_id",ids);
    if (proof.error) return { error: "증빙 정보를 확인할 수 없습니다." };
    const eligible = new Set((proof.data || []).filter(row => row.file_path && row.business_number).map(row => row.user_id));
    if (ids.some(id => !eligible.has(id))) return { error: "사업자 증빙을 제출하지 않은 회원이 포함돼 있습니다. 증빙 제출 회원만 선택해 주세요." };
  }
  const patch = decision === "grade"
    ? grade === "members" ? { staff_scope: "members" } : { member_grade: grade, ...(isAdmin ? { staff_scope: "none" } : {}) }
    : { role: decision === "approve" ? "wholesale" : "customer" };
  let query = client.from("profiles").update(patch).in("id", ids).neq("role", "admin");
  // Filter in the mutation itself: crafted requests cannot edit a staff or admin target.
  if (!isAdmin) query = query.eq("staff_scope", "none");
  const { data, error } = await query.select("id");
  if (error) return { error: "회원 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/admin/members");
  revalidatePath("/", "layout");
  return { updated: data?.length ?? 0 };
}
