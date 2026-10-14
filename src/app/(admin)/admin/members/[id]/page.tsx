import { getTranslations } from "next-intl/server";
import { readSavedPurchaseProfile } from "@/lib/store/purchase-profile";
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
 const {data}=await client.from("profiles").select("id,email,full_name,company_name,country_code,phone,business_number,role,staff_scope").eq("id",id).maybeSingle();
 if(!data||!canManageMemberTarget(session.profile,data))notFound();
 const auth=await client.auth.admin.getUserById(id);
 const sales=readSavedPurchaseProfile(auth.data.user?.user_metadata?.purchase_profile);
 const buyer=await getTranslations({locale:"ko",namespace:"buyerProfile"});
 return <main className="mx-auto max-w-3xl px-5 py-10"><Link href="/admin/members" className="text-sm text-violet-700">← 회원 목록</Link><h1 className="mt-5 text-2xl font-bold">회원 정보 수정</h1><p className="mt-2 text-sm text-zinc-500">{data.email}</p><p className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm">가입 시 선택: {auth.data.user?.user_metadata?.account_type === "personal" ? "개인회원" : auth.data.user?.user_metadata?.account_type === "business" ? "사업자회원 신청" : "기존 회원 (유형 선택 전)"} · 실제 사업자 승인은 별도 심사</p>{sales ? <section className="my-5 rounded-xl border border-zinc-200 p-4 text-sm"><h2 className="font-semibold">저장된 판매처 정보</h2><p className="mt-2 text-xs text-zinc-500">고객이 입력한 참고 정보입니다. 사업자 승인 및 공급 가능 여부는 별도로 검토합니다.</p><dl className="mt-3 grid gap-2">{[["구매 목적",buyer(`purposes.${sales.purchasePurpose}`)],["기타 구매 목적",sales.purposeOther],["판매 채널",buyer(`channels.${sales.salesChannel}`)],["판매 국가",sales.salesCountry],["판매처",sales.salesDetails]].map(([label,value])=>value ? <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div> : null)}</dl></section> : null}<MemberEditForm member={{...data,phone_number:data.phone??auth.data.user?.user_metadata?.phone_number??null}} countries={COUNTRY_REGIONS}/></main>;
}
