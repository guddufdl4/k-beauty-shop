import { readDemoOrders } from "@/lib/cart";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSafeClient } from "@/lib/supabase/safe-server";

export type AdminOrderRow = {
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  source: "database" | "cookie";
};

export type AdminOrderStats = {
  total: number;
  pending: number;
  paid: number;
};

export async function listAdminOrders(): Promise<{
  configured: boolean;
  orders: AdminOrderRow[];
  demoNote?: string;
}> {
  if (isSupabaseConfigured()) {
    const supabase = await createSafeClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number, status, total, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        return {
          configured: true,
          orders: data.map((row) => ({
            order_number: String(row.order_number),
            status: String(row.status),
            total: Number(row.total),
            created_at: String(row.created_at),
            source: "database" as const,
          })),
        };
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
      created_at: order.created_at,
      source: "cookie" as const,
    })),
    demoNote:
      "데모 주문은 이 브라우저 쿠키에만 저장됩니다. Supabase + 관리자 로그인 시 DB 주문 전체를 조회할 수 있습니다.",
  };
}

export async function getAdminOrderStats(): Promise<AdminOrderStats> {
  const { orders } = await listAdminOrders();

  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    paid: orders.filter((o) => o.status === "paid").length,
  };
}
