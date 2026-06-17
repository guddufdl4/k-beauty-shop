import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/cart";
import { constructWebhookEvent } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();
  const event = constructWebhookEvent(payload, signature);

  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderNumber = session.metadata?.order_number;

    if (orderNumber && session.payment_status === "paid") {
      await markOrderPaid(orderNumber, {
        provider: "stripe",
        sessionId: session.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
