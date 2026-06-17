"use server";

import { revalidatePath } from "next/cache";
import {
  createOrder,
  getOrderByNumber,
  markOrderPaid,
  type ShippingAddress,
} from "@/lib/cart";
import {
  createCheckoutSession,
  isStripeConfigured,
  verifyCheckoutSession,
} from "@/lib/stripe";

export type CheckoutState = {
  error?: string;
  orderNumber?: string;
  checkoutUrl?: string;
  demoMode?: boolean;
};

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const shippingAddress: ShippingAddress = {
    recipient_name: String(formData.get("recipient_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    line1: String(formData.get("line1") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim(),
    country_code: String(formData.get("country_code") ?? "KR")
      .trim()
      .toUpperCase()
      .slice(0, 2),
  };

  if (
    !shippingAddress.recipient_name ||
    !shippingAddress.phone ||
    !shippingAddress.line1 ||
    !shippingAddress.city ||
    !shippingAddress.postal_code ||
    !shippingAddress.country_code
  ) {
    return { error: "배송 정보를 모두 입력해 주세요." };
  }

  const result = await createOrder(shippingAddress);
  if (result.error || !result.orderNumber) {
    return { error: result.error ?? "주문 생성에 실패했습니다." };
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/account");
  revalidatePath("/", "layout");

  if (!isStripeConfigured()) {
    return {
      orderNumber: result.orderNumber,
      demoMode: true,
    };
  }

  const { order } = await getOrderByNumber(result.orderNumber);
  if (!order) {
    return {
      error: "주문 정보를 불러올 수 없습니다.",
      orderNumber: result.orderNumber,
      demoMode: true,
    };
  }

  const session = await createCheckoutSession({
    orderNumber: order.order_number,
    total: order.total,
    shippingCost: order.shipping_cost,
    lineItems: order.items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitAmount: item.unit_price,
    })),
  });

  if (!session.url) {
    return {
      error:
        session.error ??
        "결제 세션 생성에 실패했습니다. Stripe 키를 확인해 주세요.",
      orderNumber: result.orderNumber,
      demoMode: true,
    };
  }

  return {
    orderNumber: result.orderNumber,
    checkoutUrl: session.url,
  };
}

export async function confirmOrderPayment(
  orderNumber: string,
  sessionId: string,
): Promise<void> {
  if (!isStripeConfigured() || !sessionId) {
    return;
  }

  const verification = await verifyCheckoutSession(sessionId);
  if (
    !verification.paid ||
    !verification.orderNumber ||
    verification.orderNumber !== orderNumber
  ) {
    return;
  }

  await markOrderPaid(orderNumber, {
    provider: "stripe",
    sessionId,
  });

  revalidatePath(`/orders/${orderNumber}`);
}
