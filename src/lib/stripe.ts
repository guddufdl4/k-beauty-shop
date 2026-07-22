import Stripe from "stripe";
import { routing } from "@/i18n/routing";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function getStripeStatusMessage(): string {
  if (isStripeConfigured()) {
    return "Stripe 결제가 활성화되어 있습니다.";
  }
  return "Stripe 키가 없어 데모 모드입니다. 주문만 생성되며 결제는 건너뜁니다.";
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }

  return stripeClient;
}

export function constructWebhookEvent(
  payload: string,
  signature: string,
): Stripe.Event | null {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}

type CheckoutLineItem = {
  name: string;
  quantity: number;
  unitAmount: number;
};

export async function createCheckoutSession(input: {
  orderNumber: string;
  locale?: string;
  total: number;
  shippingCost: number;
  lineItems: CheckoutLineItem[];
}): Promise<{ url: string | null; sessionId?: string; error?: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { url: null, error: "Stripe가 설정되지 않았습니다." };
  }

  const baseUrl = getAppBaseUrl();
  const locale = routing.locales.includes(
    input.locale as (typeof routing.locales)[number],
  )
    ? input.locale
    : routing.defaultLocale;
  const productLines = input.lineItems.map((item) => ({
    price_data: {
      currency: "krw",
      product_data: { name: item.name },
      unit_amount: item.unitAmount,
    },
    quantity: item.quantity,
  }));

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...productLines,
    ...(input.shippingCost > 0
      ? [
          {
            price_data: {
              currency: "krw",
              product_data: { name: "배송비" },
              unit_amount: input.shippingCost,
            },
            quantity: 1,
          },
        ]
      : []),
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: { order_number: input.orderNumber },
      success_url: `${baseUrl}/${locale}/orders/${input.orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/checkout?cancelled=1`,
    });

    return { url: session.url, sessionId: session.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "결제 세션 생성에 실패했습니다.";
    return { url: null, error: message };
  }
}

export async function verifyCheckoutSession(sessionId: string): Promise<{
  paid: boolean;
  orderNumber: string | null;
}> {
  const stripe = getStripe();
  if (!stripe) {
    return { paid: false, orderNumber: null };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === "paid",
      orderNumber: session.metadata?.order_number ?? null,
    };
  } catch {
    return { paid: false, orderNumber: null };
  }
}
