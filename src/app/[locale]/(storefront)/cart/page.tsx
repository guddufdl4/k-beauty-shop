import { hasBusinessApproval } from "@/lib/auth/business-approval";
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
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import type { Metadata } from "next";

import { TradeNotes } from "@/components/store/trade-notes";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "cart" });
  return buildStorefrontMetadata({
    locale,
    path: "/cart",
    title: t("title"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function CartPage() {
  const [t, session, cart, locale, usdKrwRate] = await Promise.all([
    getTranslations("cart"),
    getSessionProfile(),
    getCart(),
    getLocale(),
    getUsdKrwRate(),
  ]);

  let defaultCompanyName = "";
  let defaultCountry = "";
  if (session.user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("company_name, country_code")
      .eq("id", session.user.id)
      .maybeSingle();
    defaultCompanyName = typeof data?.company_name === "string" ? data.company_name : "";
    defaultCountry = typeof data?.country_code === "string" ? data.country_code : "";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("quoteHint")}</p>
      {session.user && !hasBusinessApproval(session.profile) ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{t("approvalPending")} <Link href="/account" className="ml-3 underline">{locale === "ko" ? "사업자 증빙 제출" : "Submit business evidence"}</Link> <Link href="/wholesale-inquiry" className="ml-3 underline">{locale === "ko" ? "가격 없이 견적 문의" : "Request a quotation"}</Link></p> : null}

      {cart.items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("empty")}</p>
          <p className="mt-2 text-xs font-medium text-zinc-600">
            {t("minOrderUsd", { amount: MIN_ORDER_USD })}
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <CartItemList
              items={cart.items}
              locale={locale}
              usdKrwRate={usdKrwRate}
              showPrices={hasBusinessApproval(session.profile)}
            />
            <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">{t("orderSummary")}</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-zinc-600">{t("subtotal")}</span>
                <span>
                  {hasBusinessApproval(session.profile)
                    ? formatLocalePrice(cart.subtotal, locale, usdKrwRate)
                    : session.user ? t("approvalPending") : t("loginRequired")}
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-500">{t("quoteNote")}</p>
              <p
                className={
                  !hasBusinessApproval(session.profile) || cartMeetsMinOrderUsd(cart.subtotal, usdKrwRate)
                    ? "mt-2 text-xs text-zinc-500"
                    : "mt-2 text-xs font-medium text-rose-700"
                }
              >
                {t("minOrderUsd", { amount: MIN_ORDER_USD })}
              </p>
            </aside>
          </div>
          {hasBusinessApproval(session.profile) ? <div className="flex flex-wrap gap-3">
            <a download href="/api/cart/invoice?format=xlsx" className="rounded-xl border border-violet-200 px-4 py-3 text-sm font-semibold text-violet-700">{t("invoiceExcel")}</a>
            <a download href="/api/cart/invoice?format=pdf" className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white">{t("invoicePdf")}</a>
          </div> : null}
          <CheckoutForm
            cart={cart}
            locale={locale}
            usdKrwRate={usdKrwRate}
            isMember={Boolean(session.user)}
            showPrices={hasBusinessApproval(session.profile)}
            defaultCompanyName={defaultCompanyName}
            defaultContactName={session.profile?.full_name ?? ""}
            defaultEmail={session.profile?.email ?? session.user?.email ?? ""}
            defaultCountry={defaultCountry}
          />
        </div>
      )}
      <TradeNotes />
    </main>
  );
}
