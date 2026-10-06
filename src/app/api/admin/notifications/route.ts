import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionProfile();
  if (!session.user || session.profile?.role !== "admin") return new Response(null, { status: 403 });
  const client = createServiceClient();
  if (!client) return new Response(null, { status: 503 });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const membersQuery = client.from("profiles").select("id,full_name,company_name,created_at,role")
    .neq("role", "admin").gte("created_at", since).order("created_at", { ascending: false }).order("id").limit(100);
  const ordersQuery = () => client.from("orders").select("order_number,created_at,payment_provider")
    .gte("created_at", since).order("created_at", { ascending: false }).order("order_number").limit(100);
  const [members, initialOrders, support] = await Promise.all([membersQuery, ordersQuery().is("deleted_at", null), client.from("support_inquiries").select("id,subject,created_at").is("resolved_at", null).is("deleted_at", null).gte("created_at", since).order("created_at", { ascending: false }).order("id").limit(100)]);
  let orders = initialOrders;
  if (orders.error && /deleted_at/i.test(orders.error.message) && /does not exist|could not find/i.test(orders.error.message)) {
    orders = await ordersQuery();
  }
  if (members.error || orders.error || support.error) return new Response(null, { status: 503 });
  const notifications = [
    ...(support.data ?? []).map(inquiry => ({ id: `support:${inquiry.id}`, kind: "support", createdAt: inquiry.created_at, title: "새 고객센터 문의", detail: inquiry.subject, href: `/admin/inquiries?type=support&id=${encodeURIComponent(inquiry.id)}` })),
    ...(members.data ?? []).map(member => ({
      id: `member:${member.id}`, kind: "member", createdAt: member.created_at,
      title: member.role === "customer" ? "신규 회원 · 승인 대기" : "신규 회원 가입",
      detail: [member.full_name, member.company_name].filter(Boolean).join(" · ") || "회원 정보를 확인해 주세요.",
      href: "/admin/members",
    })),
    ...(orders.data ?? []).map(order => ({
      id: `order:${order.order_number}`, kind: "order", createdAt: order.created_at,
      title: order.payment_provider === "quote" ? "새 견적 요청" : "새 주문 접수",
      detail: order.order_number, href: `/en/orders/${encodeURIComponent(order.order_number)}`,
    })),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || a.id.localeCompare(b.id));
  return Response.json({ adminId: session.user.id, notifications }, {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
