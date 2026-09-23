"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  submitQuoteRequest,
  type CheckoutState,
} from "@/app/actions/checkout";
import { Link } from "@/i18n/navigation";
import { formatLocalePrice } from "@/lib/utils";
import { cartMeetsMinOrderUsd, MIN_ORDER_USD } from "@/lib/currency";
import type { CartView } from "@/types/cart";

type Props = {
  cart: CartView;
  locale: string;
  usdKrwRate: number;
  defaultCompanyName?: string;
  defaultContactName?: string;
  defaultEmail?: string;
};

const initialState: CheckoutState = {};

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100";

export function CheckoutForm({
  cart,
  locale,
  usdKrwRate,
  defaultCompanyName = "",
  defaultContactName = "",
  defaultEmail = "",
}: Props) {
  const t = useTranslations("checkout");
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
  const [tradeTerms, setTradeTerms] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const meetsMinOrder = cartMeetsMinOrderUsd(cart.subtotal, usdKrwRate);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 sm:p-8">
        <p className="text-base font-semibold">{t("successTitle")}</p>
        <p className="mt-2 leading-relaxed">{t("successBody")}</p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700"
        >
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="spam_trap">{t("spamTrapLabel")}</label>
        <input id="spam_trap" name="spam_trap" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("buyerTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("buyerHint")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("companyName")}</span>
            <input name="company_name" required maxLength={500} defaultValue={defaultCompanyName} className={inputClassName} />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">{t("country")}</span>
            <input name="country" required maxLength={500} className={inputClassName} />
          </label>
          <p className="sm:col-span-2 text-sm font-medium text-zinc-800">{t("contactSection")}</p>
          <label className="block">
            <span className="text-sm text-zinc-600">{t("contactName")}</span>
            <input name="contact_name" required maxLength={500} defaultValue={defaultContactName} className={inputClassName} />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">{t("email")}</span>
            <input name="email" type="email" required maxLength={500} defaultValue={defaultEmail} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("phone")}</span>
            <input name="phone" type="tel" maxLength={500} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("consignee")}</span>
            <input name="consignee" maxLength={500} placeholder={t("consigneePlaceholder")} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("notifyParty")}</span>
            <input name="notify_party" maxLength={500} placeholder={t("notifyPartyPlaceholder")} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("shippingAddress")}</span>
            <textarea
              name="shipping_address"
              rows={3}
              maxLength={500}
              placeholder={t("shippingAddressPlaceholder")}
              className={`${inputClassName} resize-y`}
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">{t("tradeTerms")}</span>
            <select
              name="trade_terms"
              value={tradeTerms}
              onChange={(event) => setTradeTerms(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t("selectOptional")}</option>
              <option value="EXW">EXW</option>
              <option value="FOB">FOB</option>
              <option value="DAP">DAP</option>
              <option value="ETC">ETC</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">{t("shippingMethod")}</span>
            <select
              name="shipping_method"
              value={shippingMethod}
              onChange={(event) => setShippingMethod(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t("selectOptional")}</option>
              <option value="Forwarder">Forwarder</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="ETC">ETC</option>
            </select>
          </label>
          {tradeTerms === "ETC" ? (
            <label className="block sm:col-span-2">
              <span className="text-sm text-zinc-600">{t("tradeTermsEtc")}</span>
              <input name="trade_terms_etc" required maxLength={500} className={inputClassName} />
            </label>
          ) : null}
          {shippingMethod === "ETC" ? (
            <label className="block sm:col-span-2">
              <span className="text-sm text-zinc-600">{t("shippingMethodEtc")}</span>
              <input name="shipping_method_etc" required maxLength={500} className={inputClassName} />
            </label>
          ) : null}
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">{t("message")}</span>
            <textarea name="message" rows={4} maxLength={5000} placeholder={t("messagePlaceholder")} className={`${inputClassName} resize-y`} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <li
              key={item.productId}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">
                  {item.sku} · {t("lineItem", { quantity: item.quantity, price: formatLocalePrice(item.unitPrice, locale, usdKrwRate) })}
                </p>
              </div>
              <p className="font-medium">{formatLocalePrice(item.lineTotal, locale, usdKrwRate)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-zinc-100 pt-4 text-sm font-semibold">
          <span>{t("referenceSubtotal")}</span>
          <span>{formatLocalePrice(cart.subtotal, locale, usdKrwRate)}</span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{t("referenceNote")}</p>
        <p className={meetsMinOrder ? "mt-2 text-xs text-zinc-500" : "mt-2 text-xs font-medium text-rose-700"}>
          {t("minOrderUsd", { amount: MIN_ORDER_USD })}
        </p>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !meetsMinOrder}
        className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? t("processing") : t("submitQuote")}
      </button>
    </form>
  );
}
