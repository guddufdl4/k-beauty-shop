import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { hasBusinessApproval } from "@/lib/auth/business-approval";
import { getCart } from "@/lib/cart";
import { getUsdKrwRate } from "@/lib/currency-rate";
import { createServiceClient } from "@/lib/supabase/service";
import { buildInvoiceExcel, buildInvoicePdf } from "@/lib/invoice/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await getSessionProfile();
  if (!session.user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!hasBusinessApproval(session.profile)) return NextResponse.json({ error: "Business approval required" }, { status: 403 });
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "xlsx" && format !== "pdf") return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  const cart = await getCart();
  if (!cart.items.length) return NextResponse.json({ error: "Quote list is empty" }, { status: 400 });
  if (cart.items.length > 500) return NextResponse.json({ error: "Maximum 500 items per invoice" }, { status: 400 });
  const client = createServiceClient();
  if (!client) return NextResponse.json({ error: "Invoice unavailable" }, { status: 503 });
  const [{ data: products, error }, { data: buyer }] = await Promise.all([
    client.from("products").select("id,compare_at_price").in("id", cart.items.map((item) => item.productId)),
    client.from("profiles").select("country_code").eq("id", session.user.id).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "Invoice unavailable" }, { status: 503 });
  const now = new Date().toISOString();
  const input = { cart, company: session.profile?.company_name ?? "", contact: session.profile?.full_name ?? "", email: session.user.email ?? "", country: buyer?.country_code ?? "", rate: await getUsdKrwRate(), retailPrices: Object.fromEntries((products ?? []).map((p) => [p.id, p.compare_at_price > 1 ? Number(p.compare_at_price) : null])), generatedAt: now };
  const content = format === "pdf" ? await buildInvoicePdf(input) : buildInvoiceExcel(input);
  return new NextResponse(new Uint8Array(content), { headers: {
    "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="HMT-Proforma-${now.slice(0,10)}.${format}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
