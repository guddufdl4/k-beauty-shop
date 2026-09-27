import { formatVisitDayLabel, seoulYmd, shiftSeoulYmd } from "@/lib/admin/visits";
import { readDemoOrders, writeDemoOrders } from "@/lib/cart";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSafeClient } from "@/lib/supabase/safe-server";
import { createServiceClient } from "@/lib/supabase/service";

export const ADMIN_ORDERS_PAGE_SIZE = 10;

export function parseAdminOrdersPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function buildAdminOrdersHref(page: number, view: "active" | "deleted" = "active"): string {
  const params = new URLSearchParams();
  if (view === "deleted") {
    params.set("view", "deleted");
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export function parseAdminOrdersView(raw: string | string[] | undefined): "active" | "deleted" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "deleted" ? "deleted" : "active";
}

function isOrderNumber(value: string): boolean {
  return /^[A-Za-z0-9-]{4,64}$/.test(value);
}

export type AdminOrderRow = {
  order_number: string;
  status: string;
  total: number;
  payment_provider: string | null;
  paid_at: string | null;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  consignee: string | null;
  notify_party: string | null;
  shipping_address_text: string | null;
  trade_terms: string | null;
  shipping_method: string | null;
  notes: string | null;
  deleted_at: string | null;
  source: "database" | "cookie";
};

export type AdminOrderStats = {
  total: number;
  pending: number;
  paid: number;
  quotes: number;
};

function snapshotField(
  address: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = address?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type AdminOrderPeriodBucket = {
  key: string;
  label: string;
  amount: number;
  count: number;
  current: boolean;
};

export type AdminOrderPeriodTotals = {
  today: { amount: number; count: number };
  thisWeek: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
  daily: AdminOrderPeriodBucket[];
  weekly: AdminOrderPeriodBucket[];
  monthly: AdminOrderPeriodBucket[];
};

export type AdminOrderList = {
  configured: boolean;
  orders: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  amountTotal: number;
  pageAmountTotal: number;
  periodTotals: AdminOrderPeriodTotals;
  view: "active" | "deleted";
  deletedCount: number;
  demoNote?: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function orderAmount(total: number): number {
  return Number.isFinite(total) ? total : 0;
}

function seoulOrderYmd(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return seoulYmd(date);
}

/** Monday of the Seoul calendar week that contains `ymd` (YYYY-MM-DD). */
export function seoulWeekStartYmd(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return shiftSeoulYmd(ymd, -daysFromMonday);
}

export function seoulMonthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function shiftSeoulYm(ym: string, months: number): string {
  const [year, month] = ym.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}`;
}

function formatWeekRangeLabel(weekStart: string, currentWeekStart: string): string {
  const weekEnd = shiftSeoulYmd(weekStart, 6);
  const [, startMonth, startDay] = weekStart.split("-");
  const [, endMonth, endDay] = weekEnd.split("-");
  const range = `${Number(startMonth)}.${Number(startDay)}.–${Number(endMonth)}.${Number(endDay)}.`;
  return weekStart === currentWeekStart ? `이번 주 · ${range}` : range;
}

function formatMonthLabel(ym: string, currentYm: string): string {
  const [year, month] = ym.split("-");
  const label = `${year}년 ${Number(month)}월`;
  return ym === currentYm ? `이번 달 · ${label}` : label;
}

function emptyPeriodTotals(): AdminOrderPeriodTotals {
  return {
    today: { amount: 0, count: 0 },
    thisWeek: { amount: 0, count: 0 },
    thisMonth: { amount: 0, count: 0 },
    daily: [],
    weekly: [],
    monthly: [],
  };
}

export function buildAdminOrderPeriodTotals(
  orders: Array<Pick<AdminOrderRow, "total" | "created_at">>,
  now = new Date(),
): AdminOrderPeriodTotals {
  const today = seoulYmd(now);
  const weekStart = seoulWeekStartYmd(today);
  const monthStart = seoulMonthStartYmd(today);
  const currentYm = today.slice(0, 7);
  const totals = emptyPeriodTotals();

  const dailyMap = new Map<string, { amount: number; count: number }>();
  for (let offset = 0; offset < 7; offset += 1) {
    dailyMap.set(shiftSeoulYmd(today, -offset), { amount: 0, count: 0 });
  }

  const weeklyMap = new Map<string, { amount: number; count: number }>();
  for (let offset = 0; offset < 4; offset += 1) {
    weeklyMap.set(shiftSeoulYmd(weekStart, -offset * 7), { amount: 0, count: 0 });
  }

  const monthlyMap = new Map<string, { amount: number; count: number }>();
  for (let offset = 0; offset < 6; offset += 1) {
    monthlyMap.set(shiftSeoulYm(currentYm, -offset), { amount: 0, count: 0 });
  }

  for (const order of orders) {
    const ymd = seoulOrderYmd(order.created_at);
    if (!ymd) {
      continue;
    }
    const amount = orderAmount(order.total);

    if (ymd === today) {
      totals.today.amount += amount;
      totals.today.count += 1;
    }
    if (ymd >= weekStart && ymd <= today) {
      totals.thisWeek.amount += amount;
      totals.thisWeek.count += 1;
    }
    if (ymd >= monthStart && ymd <= today) {
      totals.thisMonth.amount += amount;
      totals.thisMonth.count += 1;
    }

    const day = dailyMap.get(ymd);
    if (day) {
      day.amount += amount;
      day.count += 1;
    }

    const week = weeklyMap.get(seoulWeekStartYmd(ymd));
    if (week) {
      week.amount += amount;
      week.count += 1;
    }

    const month = monthlyMap.get(ymd.slice(0, 7));
    if (month) {
      month.amount += amount;
      month.count += 1;
    }
  }

  totals.daily = [...dailyMap.entries()].map(([key, bucket]) => ({
    key,
    label: formatVisitDayLabel(key, today),
    amount: bucket.amount,
    count: bucket.count,
    current: key === today,
  }));
  totals.weekly = [...weeklyMap.entries()].map(([key, bucket]) => ({
    key,
    label: formatWeekRangeLabel(key, weekStart),
    amount: bucket.amount,
    count: bucket.count,
    current: key === weekStart,
  }));
  totals.monthly = [...monthlyMap.entries()].map(([key, bucket]) => ({
    key,
    label: formatMonthLabel(key, currentYm),
    amount: bucket.amount,
    count: bucket.count,
    current: key === currentYm,
  }));

  return totals;
}

function mapOrderRow(row: {
  order_number?: unknown;
  status?: unknown;
  total?: unknown;
  payment_provider?: unknown;
  paid_at?: unknown;
  created_at?: unknown;
  shipping_address?: unknown;
  notes?: unknown;
  deleted_at?: unknown;
}): AdminOrderRow {
  const address =
    row.shipping_address && typeof row.shipping_address === "object"
      ? (row.shipping_address as Record<string, unknown>)
      : null;
  return {
    order_number: String(row.order_number),
    status: String(row.status),
    total: Number(row.total),
    payment_provider: row.payment_provider ? String(row.payment_provider) : null,
    paid_at: row.paid_at ? String(row.paid_at) : null,
    created_at: String(row.created_at),
    company_name: snapshotField(address, "company_name") ?? snapshotField(address, "line1"),
    contact_name: snapshotField(address, "recipient_name"),
    email: snapshotField(address, "email"),
    consignee: snapshotField(address, "consignee"),
    notify_party: snapshotField(address, "notify_party"),
    shipping_address_text:
      snapshotField(address, "shipping_address") ?? snapshotField(address, "line2"),
    trade_terms: [snapshotField(address, "trade_terms"), snapshotField(address, "trade_terms_etc")]
      .filter(Boolean)
      .join(" "),
    shipping_method: [snapshotField(address, "shipping_method"), snapshotField(address, "shipping_method_etc")]
      .filter(Boolean)
      .join(" "),
    notes: row.notes ? String(row.notes) : null,
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    source: "database",
  };
}

async function fetchAdminOrderRows(view: "active" | "deleted" = "active"): Promise<{
  configured: boolean;
  orders: AdminOrderRow[];
  deletedCount: number;
  demoNote?: string;
}> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient() ?? (await createSafeClient());
    if (supabase) {
      let { data, error } = await supabase
        .from("orders")
        .select(
          "order_number, status, total, payment_provider, paid_at, created_at, shipping_address, notes, deleted_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        const retry = await supabase
          .from("orders")
          .select(
            "order_number, status, total, payment_provider, paid_at, created_at, shipping_address, notes",
          )
          .order("created_at", { ascending: false })
          .limit(500);
        if (!retry.error && retry.data) {
          data = retry.data.map((row) => ({ ...row, deleted_at: null }));
          error = null;
        }
      }

      if (!error && data) {
        const mapped = data.map((row) => mapOrderRow(row));
        const deletedCount = mapped.filter((order) => order.deleted_at).length;
        const orders =
          view === "deleted"
            ? mapped.filter((order) => order.deleted_at)
            : mapped.filter((order) => !order.deleted_at);
        return { configured: true, orders, deletedCount };
      }
    }
  }

  const demoOrders = await readDemoOrders();

  return {
    configured: false,
    orders: demoOrders.map((order) => ({
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      payment_provider: order.status === "paid" ? "demo" : null,
      paid_at: order.status === "paid" ? order.created_at : null,
      created_at: order.created_at,
      company_name: null,
      contact_name: order.shipping_address.recipient_name,
      email: null,
      consignee: null,
      notify_party: null,
      shipping_address_text: order.shipping_address.line1,
      trade_terms: null,
      shipping_method: null,
      notes: null,
      deleted_at: null,
      source: "cookie" as const,
    })),
    demoNote:
      "데모 주문은 이 브라우저 쿠키에만 저장됩니다. Supabase + 관리자 로그인 시 DB 주문 전체를 조회할 수 있습니다.",
    deletedCount: 0,
  };
}

export async function listAdminOrders(
  page = 1,
  view: "active" | "deleted" = "active",
): Promise<AdminOrderList> {
  const loaded = await fetchAdminOrderRows(view);
  const total = loaded.orders.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ADMIN_ORDERS_PAGE_SIZE;
  const orders = loaded.orders.slice(start, start + ADMIN_ORDERS_PAGE_SIZE);
  const amountTotal = loaded.orders.reduce((sum, order) => sum + orderAmount(order.total), 0);
  const pageAmountTotal = orders.reduce((sum, order) => sum + orderAmount(order.total), 0);
  const periodTotals = buildAdminOrderPeriodTotals(loaded.orders);

  return {
    ...loaded,
    orders,
    total,
    page: safePage,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    totalPages,
    amountTotal,
    pageAmountTotal,
    periodTotals,
    view,
  };
}

export async function deleteAdminOrder(orderNumber: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = orderNumber.trim();
  if (!isOrderNumber(normalized)) {
    return { ok: false, error: "주문 번호가 올바르지 않습니다." };
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    if (!supabase) {
      return { ok: false, error: "주문 저장소에 연결하지 못했습니다." };
    }

    const { error } = await supabase
      .from("orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("order_number", normalized)
      .is("deleted_at", null);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  const demoOrders = await readDemoOrders();
  const next = demoOrders.filter((order) => order.order_number !== normalized);
  if (next.length === demoOrders.length) {
    return { ok: false, error: "해당 주문을 찾지 못했습니다." };
  }
  await writeDemoOrders(next);
  return { ok: true };
}

export async function restoreAdminOrder(orderNumber: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = orderNumber.trim();
  if (!isOrderNumber(normalized)) {
    return { ok: false, error: "주문 번호가 올바르지 않습니다." };
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "주문 저장소에 연결하지 못했습니다." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: null })
    .eq("order_number", normalized);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getAdminOrderStats(): Promise<AdminOrderStats> {
  const { orders } = await fetchAdminOrderRows("active");

  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    paid: orders.filter((o) => o.status === "paid").length,
    quotes: orders.filter((o) => o.payment_provider === "quote").length,
  };
}
