import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { EMPTY_WORKFLOW, type OrderWorkflow } from "./order-workflow-policy";
import type { AdminOrderRow } from "./orders";

export type OrderAdmin = { id: string; label: string };
export async function listOrderAdmins(): Promise<OrderAdmin[]> {
  const db = createServiceClient();
  if (!db) return [];
  const { data, error } = await db.from("profiles").select("id,full_name,email").eq("role", "admin").order("created_at");
  if (error) throw new Error("담당자 목록을 불러오지 못했습니다.");
  return (data ?? []).map(p => ({ id: p.id, label: p.full_name || p.email || "관리자" }));
}

export async function enrichOrderRows(orders: AdminOrderRow[]): Promise<AdminOrderRow[]> {
  const db = createServiceClient();
  if (!db || !orders.length) return orders;
  const workflows = new Map<string, OrderWorkflow>();
  const profiles = new Map<string, { country_code: string | null; member_grade: string | null }>();
  const ids = orders.map(o => o.id).filter((id): id is string => !!id);
  const users = [...new Set(orders.map(o => o.user_id).filter((id): id is string => !!id))];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from("order_admin_workflow").select("order_id,stage,assignee_id,internal_note,updated_at").in("order_id", ids.slice(i, i + 200));
    if (error) throw new Error("주문 처리 정보를 불러오지 못했습니다.");
    for (const row of data ?? []) workflows.set(row.order_id, row as OrderWorkflow);
  }
  for (let i = 0; i < users.length; i += 200) {
    const { data, error } = await db.from("profiles").select("id,country_code,member_grade").in("id", users.slice(i, i + 200));
    if (error) throw new Error("고객 정보를 불러오지 못했습니다.");
    for (const row of data ?? []) profiles.set(row.id, row);
  }
  const customerKey = (o: AdminOrderRow) => o.user_id || o.email?.trim().toLowerCase() || o.order_number;
  const counts = new Map<string, number>();
  for (const o of orders) if (!o.deleted_at) counts.set(customerKey(o), (counts.get(customerKey(o)) ?? 0) + 1);
  return orders.map(o => {
    const profile = o.user_id ? profiles.get(o.user_id) : undefined;
    return { ...o, country_code: o.country_code && o.country_code !== "XX" ? o.country_code : profile?.country_code ?? null,
      member_grade: profile?.member_grade ?? null, customer_requests: counts.get(customerKey(o)) ?? 0,
      workflow: workflows.get(o.id ?? "") ?? { ...EMPTY_WORKFLOW, stage: o.reviewed_at ? "reviewing" : "new" } };
  });
}
