import { hasBusinessApproval } from "@/lib/auth/business-approval";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getCustomerOrders } from "@/lib/account-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  try {
    const orders = await getCustomerOrders(user.id);
    const sheet = XLSX.utils.aoa_to_sheet([
      ["HMT KOREA - ORDER & QUOTE HISTORY"],
      ["Order number", "Date (UTC)", "Status", "Total", "Currency"],
      ...orders.map((order) => [order.order_number, order.created_at, order.status, hasBusinessApproval(profile) ? order.total : "", hasBusinessApproval(profile) ? order.currency : ""]),
    ]);
    sheet["!cols"] = [28, 28, 18, 18, 12].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Order history");
    const content = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(new Uint8Array(content), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="HMT-Order-History.xlsx"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return NextResponse.json({ error: "Order history unavailable" }, { status: 503 }); }
}
