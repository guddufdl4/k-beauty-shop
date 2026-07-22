"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import {
  createOrder,
  getOrderByNumber,
  markOrderPaid,
  saveStripeSessionId,
  type ShippingAddress,
} from "@/lib/cart";
import { formatCartLibError } from "@/lib/store/cart-messages";
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
  const t = await getTranslations("checkout");
  const locale = await getLocale();
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
    return { error: t("shippingRequired") };
  }

  const result = await createOrder(shippingAddress);
  const orderError = formatCartLibError(result, await getTranslations("cart"));
  if (orderError || !result.orderNumber) {
    return { error: orderError ?? t("orderCreateFailed") };
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
      error: t("orderLoadFailed"),
      orderNumber: result.orderNumber,
      demoMode: true,
    };
  }

  const session = await createCheckoutSession({
    orderNumber: order.order_number,
    locale,
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
      error: session.error ?? t("stripeSessionFailed"),
      orderNumber: result.orderNumber,
      demoMode: true,
    };
  }

  if (session.sessionId) {
    await saveStripeSessionId(result.orderNumber, session.sessionId);
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
