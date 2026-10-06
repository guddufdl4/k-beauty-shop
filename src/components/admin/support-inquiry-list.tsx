import { InquiryTrashButton } from "./inquiry-trash-button";
import Link from "next/link";
import { requireInquiryManagementSession } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { supportInquiryCopy } from "@/lib/support-inquiry-copy";
import { SupportInquiryStatus } from "./support-inquiry-status";
export async function SupportInquiryList({ page, id, deleted = false }: { page: number; id?: string; deleted?: boolean }) {
  await requireInquiryManagementSession();
  const client = createServiceClient();
  if (!client) return <p role="alert">문의를 불러올 수 없습니다.</p>;
  const focused = id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  let query = client.from("support_inquiries").select("id,created_at,contact_name,email,category,subject,message,order_number,viewed_at,resolved_at,deleted_at", { count: "exact" }).order("created_at", { ascending: false }).order("id");
  query = deleted ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (focused) query = query.eq("id", focused);
  const result = await query.range(focused ? 0 : (page - 1) * 50, focused ? 49 : page * 50 - 1);
  if (result.error) return <p role="alert">고객센터 문의를 불러오지 못했습니다.</p>;
  const date = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " KST";
  const t = supportInquiryCopy("ko");
  return <>
    <p className="mb-4 text-sm text-zinc-500">총 {result.count ?? 0}건 · {focused ? "선택한 문의" : `${page}페이지`}</p>
    <div className="space-y-4">{result.data.length === 0 ? <p className="rounded-2xl border bg-white p-6 text-zinc-500">접수된 고객센터 문의가 없습니다.</p> : result.data.map(row => <details key={row.id} open={Boolean(focused)} className="rounded-2xl border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer"><span className="mr-3 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{row.resolved_at ? "처리 완료" : row.viewed_at ? "확인됨" : "새 문의"}</span><span className="font-semibold">{row.subject}</span><span className="mt-2 block text-xs text-zinc-500">{row.contact_name} · {date(row.created_at)}</span></summary>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">{[["접수 번호", row.id],["문의 유형", t[row.category as "general"] || row.category],["이메일", row.email],["주문·견적 번호", row.order_number],["최초 확인", row.viewed_at && date(row.viewed_at)],["처리 완료", row.resolved_at && date(row.resolved_at)]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}</dl>
      <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 text-sm leading-7">{row.message}</p>
      <a href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`[HMT Support] ${String(row.subject).replace(/[\r\n]/g, " ")}`)}`} className="mt-4 inline-block text-sm font-semibold text-violet-700 underline">이메일로 답변하기</a>
      {deleted ? <p className="mt-4 text-sm text-zinc-500">삭제 일시: {date(row.deleted_at!)}</p> : <SupportInquiryStatus id={row.id} viewed={Boolean(row.viewed_at)} resolved={Boolean(row.resolved_at)} />}
      <InquiryTrashButton id={row.id} type="support" deleted={deleted} />
    </details>)}</div>
    <nav className="mt-6 flex gap-5">{focused ? <Link href={`/admin/inquiries?type=support&trash=${deleted ? "1" : "0"}`}>전체 고객센터 문의</Link> : <>{page > 1 ? <Link href={`/admin/inquiries?type=support&trash=${deleted ? "1" : "0"}&page=${page - 1}`}>← 이전</Link> : null}{(result.count ?? 0) > page * 50 ? <Link href={`/admin/inquiries?type=support&trash=${deleted ? "1" : "0"}&page=${page + 1}`}>다음 →</Link> : null}</>}</nav>
  </>;
}
