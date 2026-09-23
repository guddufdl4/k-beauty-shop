import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CartItemList } from "@/components/store/cart-item-list";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getUsdKrwRate } from "@/lib/currency";
import { formatLocalePrice } from "@/lib/utils";
import { getCart } from "@/lib/cart";
import { cartMeetsMinOrderUsd, MIN_ORDER_USD } from "@/lib/currency";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [t, session, cart, locale, usdKrwRate] = await Promise.all([
    getTranslations("cart"),
    getSessionProfile(),
    getCart(),
    getLocale(),
    getUsdKrwRate(),
  ]);

  let defaultCompanyName = "";
  if (session.user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", session.user.id)
      .maybeSingle();
    defaultCompanyName = typeof data?.company_name === "string" ? data.company_name : "";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("quoteHint")}</p>

      {cart.items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("empty")}</p>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            {t("minOrderUsd", { amount: MIN_ORDER_USD })}
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <CartItemList items={cart.items} locale={locale} usdKrwRate={usdKrwRate} />
            <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">{t("orderSummary")}</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-zinc-600">{t("subtotal")}</span>
                <span>{formatLocalePrice(cart.subtotal, locale, usdKrwRate)}</span>
              </div>
              <p className="mt-3 text-xs text-zinc-500">{t("quoteNote")}</p>
              <p
                className={
                  cartMeetsMinOrderUsd(cart.subtotal, usdKrwRate)
                    ? "mt-2 text-xs text-zinc-500"
                    : "mt-2 text-xs font-medium text-rose-700"
                }
              >
                {t("minOrderUsd", { amount: MIN_ORDER_USD })}
              </p>
            </aside>
          </div>
          <CheckoutForm
            cart={cart}
            locale={locale}
            usdKrwRate={usdKrwRate}
            defaultCompanyName={defaultCompanyName}
            defaultContactName={session.profile?.full_name ?? ""}
            defaultEmail={session.profile?.email ?? session.user?.email ?? ""}
          />
        </div>
      )}
    </main>
  );
}
