import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { parseSheetReviewDecision } from "@/lib/admin/sheet-review-decision";
import review from "@/data/catalog-sheet-review-20261014.json";

export async function PATCH(request: Request, context: {params: Promise<{id: string}>}) {
  const {user, profile} = await getSessionProfile();
  if (!user || profile?.role !== "admin") return NextResponse.json({error: "관리자 권한이 필요합니다."}, {status: 403});
  const {id} = await context.params;
  if (!review.rows.some(row => row.id === id)) return NextResponse.json({error: "검토 항목을 찾을 수 없습니다."}, {status: 404});
  const parsed = parseSheetReviewDecision(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({error: "처리 상태와 근거를 5~1,000자로 입력해 주세요."}, {status: 400});
  const db = createServiceClient();
  if (!db) return NextResponse.json({error: "저장 서비스를 사용할 수 없습니다."}, {status: 503});
  const {data: product, error} = await db.from("products").select("source_row,updated_at").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) return NextResponse.json({error: "현재 상품 정보를 읽지 못했습니다."}, {status: 503});
  if (!product) return NextResponse.json({error: "삭제되었거나 없는 상품입니다."}, {status: 404});
  const source = product.source_row && typeof product.source_row === "object" && !Array.isArray(product.source_row) ? product.source_row : {};
  const decision = {...parsed, at: new Date().toISOString(), by: user.id};
  let update = db.from("products").update({source_row: {...source, __sheet_review: decision}, updated_at: decision.at}).eq("id", id).is("deleted_at", null);
  update = product.updated_at ? update.eq("updated_at", product.updated_at) : update.is("updated_at", null);
  const result = await update.select("id").maybeSingle();
  if (result.error) return NextResponse.json({error: "검토 결과를 저장하지 못했습니다."}, {status: 503});
  if (!result.data) return NextResponse.json({error: "다른 변경이 있어 저장하지 않았습니다. 새로고침 후 다시 확인해 주세요."}, {status: 409});
  revalidatePath("/admin/catalog-review");
  return NextResponse.json({decision});
}
