import { SupportInquiryList } from "@/components/admin/support-inquiry-list";
import Link from "next/link";
import { requireAdminSession } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
export const dynamic = "force-dynamic";
export default async function AdminInquiries({ searchParams }: { searchParams: Promise<{ type?: string; page?: string; id?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const type = params.type === "wholesale" ? "wholesale" : params.type === "import" ? "import" : "support";
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.page || "1",10) || 1));
  if (type === "support") return <main className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-2xl font-bold">문의 관리</h1><nav className="my-6 flex flex-wrap gap-4"><Link href="/admin/inquiries?type=support" className="font-bold text-violet-700">고객센터 문의</Link><Link href="/admin/inquiries?type=import">수입 문의</Link><Link href="/admin/inquiries?type=wholesale">도매 문의</Link></nav><SupportInquiryList page={page} id={params.id} /><Link href="/admin" className="mt-8 inline-block text-sm text-rose-600">← 대시보드</Link></main>;
  const client = createServiceClient();
  const result = client ? await client.from(type === "import" ? "import_inquiries" : "wholesale_inquiries").select("*", { count: "exact" }).order("created_at",{ascending:false}).order("id").range((page-1)*50,page*50-1) : null;
  return <main className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-2xl font-bold">문의 관리</h1><nav className="my-6 flex flex-wrap gap-4"><Link href="/admin/inquiries?type=support">고객센터 문의</Link><Link href="/admin/inquiries?type=import" className={type === "import" ? "font-bold text-violet-700" : ""}>수입 문의</Link><Link href="/admin/inquiries?type=wholesale" className={type === "wholesale" ? "font-bold text-violet-700" : ""}>도매 문의</Link></nav>
    {!result || result.error ? <p role="alert">문의 목록을 불러오지 못했습니다.</p> : <><p className="mb-4 text-sm text-zinc-500">총 {result.count ?? 0}건 · {page}페이지</p><div className="space-y-4">{result.data.length === 0 ? <p>접수된 문의가 없습니다.</p> : result.data.map(row => <details key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-5"><summary className="cursor-pointer font-semibold">{row.company_name} · {row.product || row.interested_brands} <span className="text-xs font-normal text-zinc-500">{new Date(row.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})} KST</span></summary><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{[["담당자",row.contact_name],["국가",row.country],["이메일",row.email],["연락처",row.phone || row.whatsapp],["브랜드",row.brand || row.interested_brands],["원산지",row.origin],["공급가",row.price],["수량",row.quantity || row.estimated_quantity],["자료 링크",row.documents]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl><p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 text-sm">{row.message}</p></details>)}</div><nav className="mt-6 flex gap-5">{page>1?<Link href={`/admin/inquiries?type=${type}&page=${page-1}`}>← 이전</Link>:null}{(result.count ?? 0)>page*50?<Link href={`/admin/inquiries?type=${type}&page=${page+1}`}>다음 →</Link>:null}</nav></>}
    <Link href="/admin" className="mt-8 inline-block text-sm text-rose-600">← 대시보드</Link>
  </main>;
}
