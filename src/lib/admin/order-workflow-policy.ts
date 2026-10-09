export const ORDER_STAGES = {
  new: "신규 접수", reviewing: "확인 중", quoted: "견적 발송",
  waiting: "고객 답변 대기", confirmed: "주문 확정", shipped: "출고 완료",
} as const;
export type OrderStage = keyof typeof ORDER_STAGES;
export type OrderWorkflow = {
  stage: OrderStage; assignee_id: string | null; internal_note: string;
  updated_at: string | null;
};
export type OrderFilters = { q?: string; stage?: string; country?: string; focus?: string };
export const EMPTY_WORKFLOW: OrderWorkflow = { stage: "new", assignee_id: null, internal_note: "", updated_at: null };
export function isOrderStage(value: unknown): value is OrderStage {
  return typeof value === "string" && Object.hasOwn(ORDER_STAGES, value);
}
export function normalizeOrderFilters(input: OrderFilters): OrderFilters {
  return {
    q: input.q?.trim().slice(0, 120) || undefined,
    stage: isOrderStage(input.stage) ? input.stage : undefined,
    country: /^[A-Z]{2}$/.test(input.country?.toUpperCase() ?? "") ? input.country?.toUpperCase() : undefined,
    focus: ["unread", "unanswered", "mine"].includes(input.focus ?? "") ? input.focus : undefined,
  };
}
export function validateWorkflow(input: unknown): { value?: OrderWorkflow; error?: string } {
  if (!input || typeof input !== "object") return { error: "입력값이 올바르지 않습니다." };
  const row = input as Record<string, unknown>;
  if (!isOrderStage(row.stage)) return { error: "처리 단계를 선택해 주세요." };
  if (typeof row.internal_note !== "string" || row.internal_note.length > 5000) return { error: "메모는 5,000자 이내로 입력해 주세요." };
  if (row.assignee_id !== null && (typeof row.assignee_id !== "string" || !/^[0-9a-f-]{36}$/i.test(row.assignee_id))) return { error: "담당자가 올바르지 않습니다." };
  if (row.updated_at !== null && (typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at)))) return { error: "변경 버전을 확인할 수 없습니다. 다시 열어 주세요." };
  return { value: { stage: row.stage, assignee_id: row.assignee_id as string | null, internal_note: row.internal_note.trim(), updated_at: row.updated_at as string | null } };
}
export function matchesOrderFilters(order: { order_number: string; company_name: string | null; contact_name: string | null; email: string | null; country_code?: string | null; reviewed_at?: string | null; workflow?: OrderWorkflow }, filters: OrderFilters, adminId?: string): boolean {
  const flow = order.workflow ?? EMPTY_WORKFLOW;
  const query = filters.q?.toLocaleLowerCase();
  return (!query || [order.order_number, order.company_name, order.contact_name, order.email].some(value => value?.toLocaleLowerCase().includes(query)))
    && (!filters.stage || flow.stage === filters.stage)
    && (!filters.country || order.country_code === filters.country)
    && (filters.focus !== "unread" || (!order.reviewed_at && flow.stage === "new"))
    && (filters.focus !== "unanswered" || ["new", "reviewing"].includes(flow.stage))
    && (filters.focus !== "mine" || (!!adminId && flow.assignee_id === adminId));
}
