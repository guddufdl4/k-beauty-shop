import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { confirmOrderPayment } from "@/app/actions/checkout";
import { getUsdKrwRate } from "@/lib/currency";
import { formatLocalePrice } from "@/lib/utils";
import { getOrderByNumber } from "@/lib/cart";

type Props = {
  params: Promise<{ order_number: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { order_number } = await params;
  const { session_id: sessionId } = await searchParams;
  const [t, locale, usdKrwRate] = await Promise.all([
    getTranslations("orderConfirmation"),
    getLocale(),
    getUsdKrwRate(),
  ]);

  if (sessionId) {
    await confirmOrderPayment(order_number, sessionId);
  }

  const { order } = await getOrderByNumber(order_number);

  if (!order) {
    notFound();
  }

  const isPaid = order.status === "paid";
  const statusLabel = t(`status.${order.status}` as "status.paid");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div
        className={`rounded-2xl border px-6 py-4 ${
          isPaid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <p className={`text-sm font-medium ${isPaid ? "text-emerald-800" : "text-amber-800"}`}>
          {isPaid ? t("paymentCompleted") : t("orderReceived")}
        </p>
        <p className={`mt-1 text-2xl font-bold ${isPaid ? "text-emerald-900" : "text-amber-900"}`}>
          {order.order_number}
        </p>
        <p className={`mt-1 text-sm ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
          {t("statusLabel")}: {statusLabel}
          {!isPaid ? ` · ${t("demoHint")}` : null}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("orderItemsTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item, index) => (
            <li key={`${item.product_sku}-${index}`} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-zinc-500">
                  {t("quantitySku", { quantity: item.quantity, sku: item.product_sku })}
                </p>
              </div>
              <p className="font-medium">{formatLocalePrice(item.line_total, locale, usdKrwRate)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">{t("subtotal")}</span>
            <span>{formatLocalePrice(order.subtotal, locale, usdKrwRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">{t("shipping")}</span>
            <span>
              {order.shipping_cost === 0
                ? t("freeShipping")
                : formatLocalePrice(order.shipping_cost, locale, usdKrwRate)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>{t("total")}</span>
            <span className="text-rose-700">{formatLocalePrice(order.total, locale, usdKrwRate)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("shippingAddressTitle")}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">{t("recipient")}</dt>
            <dd className="font-medium">{order.shipping_address.recipient_name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("phone")}</dt>
            <dd className="font-medium">{order.shipping_address.phone}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("address")}</dt>
            <dd className="font-medium">
              {order.shipping_address.line1}, {order.shipping_address.city}{" "}
              {order.shipping_address.postal_code} ({order.shipping_address.country_code})
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/products"
          className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {t("continueShopping")}
        </Link>
        <Link
          href="/account"
          className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold hover:border-rose-300"
        >
          {t("myAccount")}
        </Link>
      </div>
    </main>
  );
}
