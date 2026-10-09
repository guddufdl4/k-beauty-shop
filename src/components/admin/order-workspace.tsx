"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOrderRow } from "@/lib/admin/orders";
import type { OrderAdmin } from "@/lib/admin/order-workflow";
import { ORDER_STAGES, type OrderWorkflow } from "@/lib/admin/order-workflow-policy";
import { formatKRW } from "@/lib/utils";
import { AdminOrderActionButton } from "./admin-order-action-button";
import styles from "./order-workspace.module.css";

type Detail = {
  order: { order_number: string; shipping_address: Record<string, unknown>; notes: string | null; total: number; created_at: string; deleted_at: string | null };
  items: { product_name: string; product_sku: string; unit_price: number; quantity: number; line_total: number }[];
  workflow: OrderWorkflow;
  history: { order_number: string; created_at: string; total: number }[];
};
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
const country = (code?: string | null) => {
  if (!code || code === "XX") return "국가 미등록";
  try { return `${new Intl.DisplayNames(["ko"], { type: "region" }).of(code)} (${code})`; } catch { return code; }
};

export function OrderWorkspace({ orders, admins, view, amountTotal, pageAmountTotal, total }: {
  orders: AdminOrderRow[]; admins: OrderAdmin[]; view: "active" | "deleted"; amountTotal: number; pageAmountTotal: number; total: number;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const requestSequence = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    const previousRoot = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; document.documentElement.style.overflow = previousRoot; };
  }, [selected]);
  function close() {
    if (saving || (dirty && !window.confirm("저장하지 않은 변경을 닫을까요?"))) return;
    requestSequence.current++;
    dialog.current?.close(); setSelected(null); setDirty(false);
  }
  async function open(number: string) {
    if (dirty && !window.confirm("저장하지 않은 변경을 닫고 다른 주문을 볼까요?")) return;
    const sequence = ++requestSequence.current;
    setSelected(number); setDetail(null); setError(""); setMessage(""); setDirty(false);
    if (!dialog.current?.open) dialog.current?.showModal();
    try {
      const response = await fetch(`/api/admin/order-workflow?order=${encodeURIComponent(number)}`, { cache: "no-store" });
      const data = await response.json();
      if (sequence !== requestSequence.current) return;
      if (!response.ok) throw new Error(data.error || "상세 정보를 불러오지 못했습니다.");
      setDetail(data);
    } catch (e) { if (sequence === requestSequence.current) setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
  }
  function change(patch: Partial<OrderWorkflow>) {
    setDetail(current => current ? { ...current, workflow: { ...current.workflow, ...patch } } : null); setDirty(true); setMessage("");
  }
  async function save() {
    if (!detail) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/order-workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: detail.order.order_number, workflow: detail.workflow }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setDetail(current => current ? { ...current, workflow: data.workflow } : null);
      setDirty(false); setMessage("저장했습니다."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }
  async function markRead() {
    if (!detail) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/quote-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: detail.order.order_number }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "확인 처리하지 못했습니다.");
      setDetail(current => current ? { ...current, order: { ...current.order, shipping_address: { ...current.order.shipping_address, quote_reviewed_at: new Date().toISOString() } } } : null);
      setMessage("확인 처리했습니다. 고객에게도 열람 여부가 표시됩니다."); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "확인 처리하지 못했습니다."); }
    finally { setSaving(false); }
  }
  return <>
    <div className={styles.list}>
      {!orders.length && <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">조건에 맞는 견적·주문이 없습니다.</p>}
      {orders.map(order => <article key={order.order_number} className={styles.row}>
        <div className="min-w-0">
          <button className="text-left font-mono text-xs font-semibold text-violet-700 hover:underline" onClick={() => open(order.order_number)}>{order.order_number}</button>
          <h2 className="mt-2 break-words font-semibold text-zinc-900">{order.company_name || order.contact_name || "고객 정보 미등록"}</h2>
          <p className="mt-1 text-sm text-zinc-500">{order.contact_name || "—"} · {country(order.country_code)}</p>
          <p className="mt-1 break-all text-xs text-zinc-500">{order.email || "이메일 미등록"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500"><span>{(order.customer_requests ?? 0) > 1 ? `재문의 · 누적 ${order.customer_requests}건` : "첫 요청"}</span>{order.member_grade === "vip" && <span className={styles.badge}>VIP</span>}</div>
        </div>
        <div><span className={styles.badge}>{ORDER_STAGES[order.workflow?.stage ?? "new"]}</span>
          {!order.reviewed_at && order.workflow?.stage === "new" && <p className="mt-2 text-xs font-semibold text-rose-600">미확인</p>}
          <p className="mt-2 text-xs text-zinc-500">담당: {admins.find(a => a.id === order.workflow?.assignee_id)?.label || "미지정"}</p>
        </div>
        <div className="min-w-0"><p className="font-semibold">{formatKRW(order.total)}</p><p className="mt-1 text-xs text-zinc-500">{order.payment_provider === "quote" ? "견적 요청" : order.status === "paid" ? "결제 완료" : "결제 대기"}</p><time className="mt-1 block text-xs text-zinc-500" dateTime={order.created_at}>{date(order.created_at)} KST</time><p className="mt-2 text-xs text-zinc-500">{order.trade_terms || "거래조건 미정"}</p></div>
        <button className={styles.button} onClick={() => open(order.order_number)}>상세 보기</button>
      </article>)}
    </div>
    <div className="mt-4 flex flex-wrap justify-between gap-3 rounded-2xl bg-white p-5 text-sm"><p>이 페이지 <strong>{formatKRW(pageAmountTotal)}</strong></p><p>조회 결과 {total}건 <strong>{formatKRW(amountTotal)}</strong></p></div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="order-detail-title" onCancel={event => { event.preventDefault(); close(); }}>
      <header className={styles.header}><div><p className="text-xs font-semibold text-violet-700">견적 · 주문 상세</p><h2 id="order-detail-title" className="mt-1 break-all font-semibold">{selected}</h2></div><button disabled={saving} onClick={close} className="rounded-lg border px-4 py-2 text-sm">닫기</button></header>
      <div className={styles.body}>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
        {!detail && !error && <p role="status">상세 정보를 불러오는 중…</p>}
        {!detail && error && selected && <button className={styles.button} onClick={() => open(selected)}>다시 시도</button>}
        {detail && <>
          <section className={styles.panel}><h3 className="mb-4 font-semibold">처리 관리</h3>
            <fieldset disabled={saving || !!detail.order.deleted_at}><div className={styles.fields}>
              <label className="text-sm">처리 단계<select className={styles.input} value={detail.workflow.stage} onChange={e => change({ stage: e.target.value as OrderWorkflow["stage"] })}>{Object.entries(ORDER_STAGES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="text-sm">담당 관리자<select className={styles.input} value={detail.workflow.assignee_id ?? ""} onChange={e => change({ assignee_id: e.target.value || null })}><option value="">미지정</option>{admins.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
            </div><label className="mt-4 block text-sm">내부 메모<textarea rows={4} maxLength={5000} className={styles.input} value={detail.workflow.internal_note} placeholder="재고 확인, 고객 요청, 다음 연락 일정 등을 기록하세요." onChange={e => change({ internal_note: e.target.value })} /></label>
            <p className="mt-2 text-xs text-zinc-500">관리자에게만 표시됩니다. 단계 변경으로 고객에게 메일이 발송되거나 결제 상태가 바뀌지 않습니다.</p>
            <div className="mt-4 flex flex-wrap gap-3"><button disabled={!dirty || saving} onClick={save} className={styles.button}>{saving ? "처리 중…" : "변경 저장"}</button>{!detail.order.shipping_address?.quote_reviewed_at && orders.find(o => o.order_number === detail.order.order_number)?.payment_provider === "quote" && <button onClick={markRead} className="rounded-lg border px-4 py-2 text-sm">확인 처리</button>}</div></fieldset>
          </section>
          <section className={styles.panel}><h3 className="mb-3 font-semibold">고객 · 거래 정보</h3><dl className="grid gap-3 text-sm">{[
            ["회사", "company_name"], ["담당자", "recipient_name"], ["이메일", "email"], ["연락처", "phone"], ["국가", "country_code"], ["수하인", "consignee"], ["통지처", "notify_party"], ["주소", "shipping_address"], ["거래조건", "trade_terms"], ["기타 거래조건", "trade_terms_etc"], ["고객 지정 운송사", "shipping_method"], ["기타 운송사", "shipping_method_etc"],
          ].map(([label, key]) => <div key={key} className="grid grid-cols-[110px_1fr] gap-3"><dt className="text-zinc-500">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{String(detail.order.shipping_address?.[key] || "—")}</dd></div>)}<div><dt className="text-zinc-500">고객 요청사항</dt><dd className="mt-1 whitespace-pre-wrap break-words">{detail.order.notes || "—"}</dd></div></dl></section>
          <section className={styles.panel}><h3 className="mb-3 font-semibold">요청 상품 · {detail.items.length}종</h3>{detail.items.map((item, index) => <div key={index} className="border-t border-zinc-100 py-3 text-sm"><p className="font-medium">{item.product_name}</p><p className="mt-1 break-all text-xs text-zinc-500">{item.product_sku} · {item.quantity}개 × {formatKRW(item.unit_price)}</p><p className="mt-2 text-right font-semibold">{formatKRW(item.line_total)}</p></div>)}<p className="mt-3 text-right font-bold">합계 {formatKRW(detail.order.total)}</p></section>
          <section className={styles.panel}><h3 className="mb-3 font-semibold">이 고객의 다른 요청 · 최근 20건</h3>{!detail.history.length && <p className="text-sm text-zinc-500">다른 요청이 없습니다.</p>}{detail.history.map(item => <div key={item.order_number} className={styles.history}><button disabled={saving} className="text-left text-sm text-violet-700" onClick={() => open(item.order_number)}>{item.order_number}<time className="mt-1 block text-xs text-zinc-500">{date(item.created_at)}</time></button><span className="text-sm">{formatKRW(item.total)}</span></div>)}</section>
          <details className={styles.panel}><summary className="cursor-pointer text-sm text-zinc-500">더 보기 · {view === "deleted" ? "복원" : "삭제"}</summary><div className="mt-4"><AdminOrderActionButton orderNumber={detail.order.order_number} restore={!!detail.order.deleted_at} onSuccess={() => { dialog.current?.close(); setSelected(null); setDetail(null); setDirty(false); router.refresh(); }} /></div></details>
        </>}
      </div>
    </dialog>
  </>;
}
