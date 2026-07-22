import { NextResponse } from "next/server";
import { getOrderByNumber, saveStripeSessionId } from "@/lib/cart";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe 키가 설정되지 않았습니다. 데모 모드로 주문만 생성됩니다." },
      { status: 503 },
    );
  }

  let body: { orderNumber?: string; locale?: string };
  try {
    body = (await request.json()) as { orderNumber?: string; locale?: string };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const orderNumber = body.orderNumber?.trim();
  if (!orderNumber) {
    return NextResponse.json({ error: "주문 번호가 필요합니다." }, { status: 400 });
  }

  const { order } = await getOrderByNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.status === "paid") {
    return NextResponse.json({ error: "이미 결제된 주문입니다." }, { status: 400 });
  }

  const result = await createCheckoutSession({
    orderNumber: order.order_number,
    locale: body.locale,
    total: order.total,
    shippingCost: order.shipping_cost,
    lineItems: order.items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitAmount: item.unit_price,
    })),
  });

  if (!result.url) {
    return NextResponse.json(
      { error: result.error ?? "결제 세션 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  if (result.sessionId) {
    await saveStripeSessionId(orderNumber, result.sessionId);
  }

  return NextResponse.json({ url: result.url });
}
