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

export type AdminOrderList = {
  configured: boolean;
  orders: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  amountTotal: number;
  pageAmountTotal: number;
  view: "active" | "deleted";
  deletedCount: number;
  demoNote?: string;
};

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
  const amountTotal = loaded.orders.reduce((sum, order) => sum + (Number.isFinite(order.total) ? order.total : 0), 0);
  const pageAmountTotal = orders.reduce((sum, order) => sum + (Number.isFinite(order.total) ? order.total : 0), 0);

  return {
    ...loaded,
    orders,
    total,
    page: safePage,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    totalPages,
    amountTotal,
    pageAmountTotal,
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
