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
import { withReturnTo } from "@/lib/auth/return-to";
import type { CartView } from "@/types/cart";

import { SIGNUP_COUNTRIES } from "@/lib/auth/signup-fields";

type Props = {
  cart: CartView;
  locale: string;
  usdKrwRate: number;
  isMember: boolean;
  defaultCompanyName?: string;
  defaultContactName?: string;
  defaultEmail?: string;
  defaultCountry?: string;
};

const initialState: CheckoutState = {};

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";

export function CheckoutForm({
  cart,
  locale,
  usdKrwRate,
  isMember,
  defaultCompanyName = "",
  defaultContactName = "",
  defaultEmail = "",
  defaultCountry = "",
}: Props) {
  const t = useTranslations("checkout");
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
  const [tradeTerms, setTradeTerms] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const meetsMinOrder = cartMeetsMinOrderUsd(cart.subtotal, usdKrwRate);

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
        <p className="font-semibold text-zinc-900">{t("loginRequired")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={withReturnTo("/login", "/cart")}
            className="inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {t("loginAction")}
          </Link>
          <Link
            href={withReturnTo("/signup", "/cart")}
            className="inline-flex rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800"
          >
            {t("createWholesaleAccount")}
          </Link>
        </div>
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
          <label className="block sm:col-span-2" htmlFor="company_name">
            <span className="text-sm text-zinc-600">{t("companyName")}</span>
            <input id="company_name" name="company_name" required maxLength={500} defaultValue={defaultCompanyName} className={inputClassName} />
          </label>
          <label className="block" htmlFor="country">
            <span className="text-sm text-zinc-600">{t("country")}</span>
            <select id="country" name="country" required defaultValue={SIGNUP_COUNTRIES.find((country) => country.code === defaultCountry || country.name === defaultCountry)?.code ?? ""} className={inputClassName}>
              <option value="">{t("selectCountry")}</option>
              {SIGNUP_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
          </label>
          <p className="sm:col-span-2 text-sm font-medium text-zinc-800">{t("contactSection")}</p>
          <label className="block" htmlFor="contact_name">
            <span className="text-sm text-zinc-600">{t("contactName")}</span>
            <input id="contact_name" name="contact_name" required maxLength={500} defaultValue={defaultContactName} className={inputClassName} />
          </label>
          <label className="block" htmlFor="email">
            <span className="text-sm text-zinc-600">{t("email")}</span>
            <input id="email" name="email" type="email" required maxLength={500} defaultValue={defaultEmail} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2" htmlFor="phone">
            <span className="text-sm text-zinc-600">{t("phone")}</span>
            <input id="phone" name="phone" type="tel" maxLength={500} className={inputClassName} />
          </label>
          <label className="block sm:col-span-2" htmlFor="shipping_address">
            <span className="text-sm text-zinc-600">{t("shippingAddress")}</span>
            <textarea
              id="shipping_address"
              name="shipping_address"
              rows={3}
              maxLength={500}
              placeholder={t("shippingAddressPlaceholder")}
              className={`${inputClassName} resize-y`}
            />
          </label>
          <label className="block" htmlFor="trade_terms">
            <span className="text-sm text-zinc-600">{t("tradeTerms")}</span>
            <select
              id="trade_terms"
              name="trade_terms"
              value={tradeTerms}
              onChange={(event) => setTradeTerms(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t("selectOptional")}</option>
              <option value="EXW">EXW</option>
              <option value="FOB">FOB</option>
              <option value="DAP">DAP</option>
              <option value="Discuss with sales">{t("discussWithSales")}</option>
              <option value="ETC">{t("customEntry")}</option>
            </select>
          </label>
          <label className="block" htmlFor="shipping_method">
            <span className="text-sm text-zinc-600">{t("shippingMethod")}</span>
            <select
              id="shipping_method"
              name="shipping_method"
              value={shippingMethod}
              onChange={(event) => setShippingMethod(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t("selectOptional")}</option>
              <option value="Discuss with sales">{t("discussWithSales")}</option>
              <option value="Forwarder">Forwarder</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="ETC">{t("customEntry")}</option>
            </select>
          </label>
          {tradeTerms === "ETC" ? (
            <label className="block sm:col-span-2" htmlFor="trade_terms_etc">
              <span className="text-sm text-zinc-600">{t("tradeTermsEtc")}</span>
              <input id="trade_terms_etc" name="trade_terms_etc" required maxLength={500} className={inputClassName} />
            </label>
          ) : null}
          {shippingMethod === "ETC" ? (
            <label className="block sm:col-span-2" htmlFor="shipping_method_etc">
              <span className="text-sm text-zinc-600">{t("shippingMethodEtc")}</span>
              <input id="shipping_method_etc" name="shipping_method_etc" required maxLength={500} className={inputClassName} />
            </label>
          ) : null}
          <label className="block sm:col-span-2" htmlFor="message">
            <span className="text-sm text-zinc-600">{t("message")}</span>
            <textarea id="message" name="message" rows={4} maxLength={5000} placeholder={t("messagePlaceholder")} className={`${inputClassName} resize-y`} />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">
                  {[item.productCode, item.sku].filter(Boolean).join(" · ")} ·{" "}
                  {t("lineItem", { quantity: item.quantity, price: formatLocalePrice(item.unitPrice, locale, usdKrwRate) })}
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
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !meetsMinOrder}
        className="w-full rounded-xl bg-violet-700 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? t("processing") : t("submitQuote")}
      </button>
    </form>
  );
}
