import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";
import { catalogReviewExportRows } from "@/lib/admin/catalog-review";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { configured, user, profile } = await getSessionProfile();
  if (!configured) return NextResponse.json({ error: "데이터베이스가 설정되지 않았습니다." }, { status: 503 });
  if (!user || profile?.role !== "admin") return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  const ids = [...new Set(new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [])];
  if (!ids.length || ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    return NextResponse.json({ error: "내려받을 상품을 1~100개 선택해 주세요." }, { status: 400 });
  }
  const database = await createSafeClient();
  if (!database) return NextResponse.json({ error: "데이터베이스에 연결하지 못했습니다." }, { status: 503 });
  const { data, error } = await database.from("products")
    .select("id, product_code, name, brand, sku, barcode, wholesale_price, compare_at_price, source_row")
    .in("id", ids).is("deleted_at", null);
  if (error) return NextResponse.json({ error: "엑셀 자료를 조회하지 못했습니다." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "선택한 상품을 찾을 수 없습니다." }, { status: 404 });
  const order = new Map(ids.map((id, index) => [id, index]));
  data.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const sheet = XLSX.utils.json_to_sheet(catalogReviewExportRows(data));
  sheet["!cols"] = [{wch:16},{wch:20},{wch:60},{wch:20},{wch:18},{wch:18},{wch:45},{wch:25},{wch:12}];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "상품 확인 요청");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return new Response(bytes, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="HMT-product-review-${date}.xlsx"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  }});
}
