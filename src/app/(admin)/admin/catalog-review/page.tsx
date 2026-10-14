import { getBrandFilterValue } from "@/lib/store/products-url";
import { createServiceClient } from "@/lib/supabase/service";
import { readSheetReviewDecision } from "@/lib/admin/sheet-review-decision";
import { SheetReviewForm } from "@/components/admin/sheet-review-form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import review from "@/data/catalog-sheet-review-20261014.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "공급사 시트 대조 검토함", robots: { index: false, follow: false } };

export default async function CatalogReviewPage({searchParams}: {searchParams: Promise<{q?:string;kind?:string;page?:string;state?:string}>}) {
  const {user,profile}=await getSessionProfile();
  if (!user || profile?.role !== "admin") redirect("/en/login");
  const params=await searchParams;
  const db=createServiceClient();
  const saved: {data: Array<{id:string;decision:unknown}>; error: unknown} = {data:[],error: db ? null : "unavailable"};
  if (db) for (let offset=0; ;offset+=1000) {
    const result=await db.from("products").select("id,decision:source_row->__sheet_review").not("source_row->__sheet_review","is",null).order("id").range(offset,offset+999);
    if (result.error) {saved.error=result.error;break;}
    saved.data.push(...result.data);
    if (result.data.length<1000) break;
  }
  const decisions=new Map((saved?.data ?? []).map(row=>[row.id,readSheetReviewDecision({__sheet_review:row.decision})]));
  const normalizeName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9가-힣]/g,"");
  const exactEvidence=(row: typeof review.rows[number])=>Boolean(row.barcode && row.sheetName && row.sheetBrand && getBrandFilterValue(row.brand)===getBrandFilterValue(row.sheetBrand) && normalizeName(row.name)===normalizeName(row.sheetName));
  const evidenceCount=review.rows.filter(exactEvidence).length;
  const reviewState=params.state || "";
  const query=(params.q||"").trim().toLowerCase();
  const kind=params.kind === "brand-difference" || params.kind === "unmatched" ? params.kind : "";
  const filtered=review.rows.filter(p=>(!reviewState || (reviewState==="evidence-match" ? exactEvidence(p) : (decisions.get(p.id)?.state ?? "pending")===reviewState)) && (!kind || p.kind===kind) && (!query || [p.code,p.name,p.brand,p.barcode,p.sheetBrand].some(v=>String(v||"").toLowerCase().includes(query))));
  const pages=Math.max(1,Math.ceil(filtered.length/20));
  const page=Math.min(pages,Math.max(1,Number.parseInt(params.page||"1",10)||1));
  const href=(n:number)=>"/admin/catalog-review?"+new URLSearchParams({q:params.q||"",kind,state:reviewState,page:String(n)});
  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">공급사 시트 대조 검토함</h1><Link href="/admin/products" className="text-violet-700 underline">상품 관리로 돌아가기</Link></div>
    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">2026년 10월 13일 공급사 시트를 기준으로 한 대조 기록입니다. 불일치는 미취급 확정이 아닙니다. 브랜드 표기 차이·옵션·용량을 원본과 확인한 뒤 수정하세요. 상품과 가격을 임의 삭제하거나 추정하지 않습니다.</p>
    <div className="grid grid-cols-3 gap-3 text-center text-sm">{[["전체 검토",review.rows.length],["브랜드·표기 대조",review.rows.filter(p=>p.kind==="brand-difference").length],["정확 일치 미확인",review.rows.filter(p=>p.kind==="unmatched").length]].map(([label,count])=><div key={label} className="rounded-xl border bg-white p-3"><p>{label}</p><strong className="text-xl">{count}</strong></div>)}</div>
    {(!saved || saved.error) ? <p role="alert" className="text-sm text-red-700">검토 기록을 불러오지 못했습니다. 미검토로 표시된 항목은 저장 여부를 다시 확인하세요.</p> : null}
    <p className="text-sm">상품명·바코드·브랜드 표기 대조 일치 {evidenceCount}개 · 저장된 검토 {decisions.size}개 · 처리 상태 기록이며 상품 수정·판매 중단과는 별개입니다.</p>
    <form className="flex flex-wrap gap-2"><input name="q" defaultValue={params.q} aria-label="브랜드·상품명·HMT 코드·바코드 검색" placeholder="브랜드·상품명·HMT 코드·바코드" className="min-h-11 min-w-0 flex-1 rounded-lg border px-3"/><select name="kind" defaultValue={kind} aria-label="대조 분류" className="min-h-11 rounded-lg border px-3"><option value="">전체</option><option value="brand-difference">브랜드·표기 대조</option><option value="unmatched">정확 일치 미확인</option></select><button className="rounded-lg bg-violet-700 px-5 py-3 text-white">검색</button></form>
    <p className="text-sm text-zinc-500">검색 결과 {filtered.length}개 · {page}/{pages}페이지 · 대조일 {review.checkedAt.slice(0,10)}</p>
    <div className="space-y-3">{filtered.slice((page-1)*20,page*20).map(p=><article key={p.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="text-xs text-violet-700">{p.kind==="brand-difference"?"브랜드·표기 대조":"정확 일치 미확인"} · {p.status==="active"?"공개 중":"비공개"}</p><h2 className="mt-1 break-words font-semibold">{p.brand} · {p.name}</h2><p className="mt-1 break-all text-sm text-zinc-500">{p.code} · 바코드 {p.barcode||"미등록"}</p></div><Link href={"/admin/products?tab=list&q="+encodeURIComponent(p.code||p.name)} className="self-start rounded-lg border px-3 py-2 text-sm text-violet-700">현재 상품 확인</Link></div>{p.sheetName?<div className="mt-3 border-t pt-3 text-sm"><p className="font-medium">시트: {p.sheetBrand} · {p.sheetName}</p><p className="mt-1 text-zinc-500">{p.sheet} · 원본 {p.row}행</p></div>:<p className="mt-3 text-sm text-zinc-500">바코드·상품명으로 정확한 원본 행을 찾지 못했습니다. 공급사 시트에서 옵션과 용량을 확인하세요.</p>}{exactEvidence(p) ? <p className="mt-3 text-sm text-emerald-700">원본 상품명·바코드·브랜드 별칭 대조 일치. 가격·판매 상태까지 확인했다는 뜻은 아닙니다.</p> : null}<SheetReviewForm id={p.id} decision={decisions.get(p.id) ?? null}/></article>)}</div>
    {!filtered.length?<p className="rounded-xl border p-5 text-sm">해당 조건의 검토 항목이 없습니다.</p>:null}
    <nav aria-label="검토함 페이지" className="flex justify-between">{page>1?<Link href={href(page-1)} className="rounded-lg border px-4 py-3">이전</Link>:<span/>}{page<pages?<Link href={href(page+1)} className="rounded-lg border px-4 py-3">다음</Link>:null}</nav>
  </main>;
}
