import Link from "next/link";
import {notFound} from "next/navigation";
import {getSessionProfile} from "@/lib/supabase/auth-helpers";
import {createServiceClient} from "@/lib/supabase/service";
import {canManageMemberTarget} from "@/lib/auth/member-access";
import {COUNTRY_REGIONS} from "@/lib/auth/country-regions";
import {MemberEditForm} from "./member-edit-form";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const session=await getSessionProfile();const client=createServiceClient();
 if(!session.user||!client||!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {data}=await client.from("profiles").select("id,email,full_name,company_name,country_code,business_number,role,staff_scope").eq("id",id).maybeSingle();
 if(!data||!canManageMemberTarget(session.profile,data))notFound();
 const auth=await client.auth.admin.getUserById(id);
 return <main className="mx-auto max-w-3xl px-5 py-10"><Link href="/admin/members" className="text-sm text-violet-700">← 회원 목록</Link><h1 className="mt-5 text-2xl font-bold">회원 정보 수정</h1><p className="mt-2 text-sm text-zinc-500">{data.email}</p><MemberEditForm member={{...data,phone_number:auth.data.user?.user_metadata?.phone_number||null}} countries={COUNTRY_REGIONS}/></main>;
}
