import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CartItemList } from "@/components/store/cart-item-list";
import { getUsdKrwRate } from "@/lib/currency";
import { formatLocalePrice } from "@/lib/utils";
import {
  calculateShippingCost,
  getCart,
  usesDatabaseCart,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [t, cart, dbCart, locale, usdKrwRate] = await Promise.all([
    getTranslations("cart"),
    getCart(),
    usesDatabaseCart(),
    getLocale(),
    getUsdKrwRate(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {dbCart ? t("loggedInHint") : t("demoHint")}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("empty")}</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <CartItemList items={cart.items} locale={locale} usdKrwRate={usdKrwRate} />

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">{t("orderSummary")}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">{t("subtotal")}</span>
                <span>{formatLocalePrice(cart.subtotal, locale, usdKrwRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">{t("shipping")}</span>
                <span>
                  {calculateShippingCost(cart.subtotal) === 0
                    ? t("freeShipping")
                    : formatLocalePrice(calculateShippingCost(cart.subtotal), locale, usdKrwRate)}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{t("freeShippingNote")}</p>
            </div>
            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-xl bg-rose-600 py-3 text-center font-semibold text-white hover:bg-rose-700"
            >
              {t("checkout")}
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
