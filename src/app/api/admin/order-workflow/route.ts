import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { EMPTY_WORKFLOW, validateWorkflow } from "@/lib/admin/order-workflow-policy";

export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const validNumber = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9-]{4,64}$/.test(value);

export async function GET(request: Request) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return reply({ error: "관리자 권한이 필요합니다." }, 403);
  const number = new URL(request.url).searchParams.get("order");
  if (!validNumber(number)) return reply({ error: "주문 번호가 올바르지 않습니다." }, 400);
  const db = createServiceClient();
  if (!db) return reply({ error: "서버 연결을 확인해 주세요." }, 503);
  const order = await db.from("orders").select("id,user_id,order_number,shipping_address,notes,total,created_at,deleted_at").eq("order_number", number).maybeSingle();
  if (order.error) return reply({ error: "주문을 불러오지 못했습니다." }, 503);
  if (!order.data) return reply({ error: "주문을 찾을 수 없습니다." }, 404);
  const row = order.data;
  const [items, workflow] = await Promise.all([
    db.from("order_items").select("product_name,product_sku,unit_price,quantity,line_total").eq("order_id", row.id),
    db.from("order_admin_workflow").select("stage,assignee_id,internal_note,updated_at").eq("order_id", row.id).maybeSingle(),
  ]);
  if (items.error || workflow.error) return reply({ error: "상세 정보를 불러오지 못했습니다." }, 503);
  const address = row.shipping_address as Record<string, unknown> | null;
  let historyQuery = db.from("orders").select("order_number,created_at,total").is("deleted_at", null).neq("id", row.id).order("created_at", { ascending: false }).limit(20);
  if (row.user_id) historyQuery = historyQuery.eq("user_id", row.user_id);
  else if (typeof address?.email === "string" && address.email.trim()) historyQuery = historyQuery.eq("shipping_address->>email", address.email);
  else return reply({ order: row, items: items.data, workflow: workflow.data ?? { ...EMPTY_WORKFLOW, stage: address?.quote_reviewed_at ? "reviewing" : "new" }, history: [] });
  const history = await historyQuery;
  if (history.error) return reply({ error: "고객 이력을 불러오지 못했습니다." }, 503);
  return reply({ order: row, items: items.data, workflow: workflow.data ?? { ...EMPTY_WORKFLOW, stage: address?.quote_reviewed_at ? "reviewing" : "new" }, history: history.data });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "요청 출처를 확인해 주세요." }, 403);
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return reply({ error: "관리자 권한이 필요합니다." }, 403);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "입력값이 올바르지 않습니다." }, 400); }
  if (!validNumber(body?.orderNumber)) return reply({ error: "주문 번호가 올바르지 않습니다." }, 400);
  const parsed = validateWorkflow(body.workflow);
  if (!parsed.value) return reply({ error: parsed.error }, 400);
  const db = createServiceClient();
  if (!db) return reply({ error: "서버 연결을 확인해 주세요." }, 503);
  const flow = parsed.value;
  if (flow.assignee_id) {
    const assignee = await db.from("profiles").select("id").eq("id", flow.assignee_id).eq("role", "admin").maybeSingle();
    if (assignee.error) return reply({ error: "담당자를 확인하지 못했습니다." }, 503);
    if (!assignee.data) return reply({ error: "현재 관리자만 담당자로 지정할 수 있습니다." }, 400);
  }
  const order = await db.from("orders").select("id").eq("order_number", body.orderNumber).is("deleted_at", null).maybeSingle();
  if (order.error) return reply({ error: "주문을 확인하지 못했습니다." }, 503);
  if (!order.data) return reply({ error: "주문을 찾을 수 없거나 삭제되었습니다." }, 404);
  const saved = { order_id: order.data.id, stage: flow.stage, assignee_id: flow.assignee_id, internal_note: flow.internal_note, updated_by: user.id, updated_at: new Date().toISOString() };
  // Insert or compare-and-swap; never overwrite a second administrator's changes.
  const result = flow.updated_at
    ? await db.from("order_admin_workflow").update(saved).eq("order_id", order.data.id).eq("updated_at", flow.updated_at).select("stage,assignee_id,internal_note,updated_at").maybeSingle()
    : await db.from("order_admin_workflow").insert(saved).select("stage,assignee_id,internal_note,updated_at").single();
  if (result.error?.code === "23505" || (!result.error && !result.data)) return reply({ error: "다른 관리자가 변경했습니다. 상세창을 다시 열어 최신 내용을 확인해 주세요." }, 409);
  if (result.error) return reply({ error: "저장하지 못했습니다. 다시 시도해 주세요." }, 503);
  revalidatePath("/admin/orders");
  return reply({ workflow: result.data });
}
