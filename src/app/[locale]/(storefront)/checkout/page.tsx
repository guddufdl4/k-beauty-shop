import { getTranslations, getLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getUsdKrwRate } from "@/lib/currency";
import {
  calculateShippingCost,
  getCart,
  usesDatabaseCart,
} from "@/lib/cart";
import { getStripeStatusMessage, isStripeConfigured } from "@/lib/stripe";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [cart, dbCart, params, t, locale, usdKrwRate] = await Promise.all([
    getCart(),
    usesDatabaseCart(),
    searchParams,
    getTranslations("checkout"),
    getLocale(),
    getUsdKrwRate(),
  ]);
  const shippingCost = calculateShippingCost(cart.subtotal);
  const total = cart.subtotal + shippingCost;
  const stripeEnabled = isStripeConfigured();

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("emptyCart")}</p>
          <Link
            href="/cart"
            className="mt-4 inline-block py-3 text-sm text-rose-600 hover:underline"
          >
            {t("backToCart")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/cart" className="text-sm text-rose-600 hover:underline">
        {t("backToCart")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t("titleWithOrder")}</h1>
      {params.cancelled ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("cancelled")}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">
        {dbCart ? t("dbHint") : t("demoHint")}
      </p>
      <div className="mt-8">
        <CheckoutForm
          cart={cart}
          shippingCost={shippingCost}
          total={total}
          stripeEnabled={stripeEnabled}
          stripeMessage={getStripeStatusMessage()}
          locale={locale}
          usdKrwRate={usdKrwRate}
        />
      </div>
    </main>
  );
}
