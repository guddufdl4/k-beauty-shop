import { getTranslations, getLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getUsdKrwRate } from "@/lib/currency";
import {
  calculateShippingCost,
  getCart,
} from "@/lib/cart";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getStripeStatusMessage, isStripeConfigured } from "@/lib/stripe";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [cart, session, params, t, locale, usdKrwRate] = await Promise.all([
    getCart(),
    getSessionProfile(),
    searchParams,
    getTranslations("checkout"),
    getLocale(),
    getUsdKrwRate(),
  ]);
  const isLoggedIn = Boolean(session.user);
  const shippingCost = calculateShippingCost(cart.subtotal);
  const total = cart.subtotal + shippingCost;
  const stripeEnabled = isStripeConfigured();

  if (!isLoggedIn) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("loginRequired")}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {t("loginAction")}
          </Link>
        </div>
      </main>
    );
  }

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
      <p className="mt-2 text-sm text-zinc-600">{t("dbHint")}</p>
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
