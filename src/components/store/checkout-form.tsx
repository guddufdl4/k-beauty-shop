"use client";
import { PURCHASE_PURPOSES, SALES_CHANNELS, type PurchaseProfile } from "@/lib/store/purchase-profile";
import { QUOTE_DRAFT_FIELDS, readQuoteDraft } from "@/lib/store/quote-draft";

import { useActionState, useState, useRef, useEffect } from "react";
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
  showPrices?: boolean;
  quoteEligible?: boolean;
  defaultPurchaseProfile?: PurchaseProfile;
  draftId?: string;
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
  showPrices = true,
  quoteEligible,
  defaultPurchaseProfile,
  draftId = "",
  defaultCompanyName = "",
  defaultContactName = "",
  defaultEmail = "",
  defaultCountry = "",
}: Props) {
  const t = useTranslations("checkout");
  const tBuyer = useTranslations("buyerProfile");
  const [purchasePurpose, setPurchasePurpose] = useState(defaultPurchaseProfile?.purchasePurpose ?? "");
  const [salesChannel, setSalesChannel] = useState(defaultPurchaseProfile?.salesChannel ?? "");
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
  const [tradeTerms, setTradeTerms] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const meetsMinOrder = quoteEligible ?? cartMeetsMinOrderUsd(cart.subtotal, usdKrwRate);
  const formRef = useRef<HTMLFormElement>(null);
  const restoreFields = useRef<Record<string,string> | null>(null);
  const draftKey = draftId ? `hmt-quote-draft:${draftId}` : "";
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftKey || !formRef.current) return;
    const frame = window.requestAnimationFrame(() => {
    if (!formRef.current) return;
    try {
      const fields = readQuoteDraft(sessionStorage.getItem(draftKey));
      if (!fields) {sessionStorage.removeItem(draftKey); return;}
      if (!fields.purchase_purpose && defaultPurchaseProfile) {
        Object.assign(fields, { purchase_purpose: defaultPurchaseProfile.purchasePurpose, purpose_other: defaultPurchaseProfile.purposeOther, sales_channel: defaultPurchaseProfile.salesChannel, sales_country: defaultPurchaseProfile.salesCountry, sales_details: defaultPurchaseProfile.salesDetails });
      }
      if (!(PURCHASE_PURPOSES as readonly string[]).includes(fields.purchase_purpose)) fields.purchase_purpose = "";
      if (!(SALES_CHANNELS as readonly string[]).includes(fields.sales_channel)) fields.sales_channel = "";
      restoreFields.current = fields;
      setPurchasePurpose(fields.purchase_purpose ?? "");
      setSalesChannel(fields.sales_channel ?? "");
      setTradeTerms(typeof fields.trade_terms === "string" ? fields.trade_terms : "");
      setShippingMethod(typeof fields.shipping_method === "string" ? fields.shipping_method : "");
      for (const element of Array.from(formRef.current.elements)) {
        if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) && element.name !== "spam_trap" && typeof fields[element.name] === "string") element.value = fields[element.name].slice(0,5000);
      }
    } catch { /* Storage can be disabled in private browsing. */ }
    });
    return () => {window.cancelAnimationFrame(frame);if(saveTimer.current) clearTimeout(saveTimer.current);};
  }, [draftKey, defaultPurchaseProfile]);
  useEffect(() => {
    const fields = restoreFields.current;
    if (!fields || tradeTerms !== (fields.trade_terms ?? "") || shippingMethod !== (fields.shipping_method ?? "") || purchasePurpose !== (fields.purchase_purpose ?? "") || salesChannel !== (fields.sales_channel ?? "")) return;
    for (const name of ["trade_terms_etc", "shipping_method_etc", "purpose_other", "sales_details", "sales_country"]) {
      const input = formRef.current?.elements.namedItem(name);
      if ((input instanceof HTMLInputElement || input instanceof HTMLSelectElement) && typeof fields[name] === "string") input.value = fields[name];
    }
    restoreFields.current = null;
  }, [tradeTerms, shippingMethod, purchasePurpose, salesChannel]);
  const saveDraft = () => {
    if (!draftKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!formRef.current) return;
      const fields: Record<string,string> = {};
      for (const [name,value] of new FormData(formRef.current)) if ((QUOTE_DRAFT_FIELDS as readonly string[]).includes(name) && typeof value === "string") fields[name] = value.slice(0,5000);
      try {sessionStorage.setItem(draftKey,JSON.stringify({at:Date.now(),fields}));} catch { /* The form still works without storage. */ }
    }, 250);
  };

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
    <form ref={formRef} action={formAction} onChange={saveDraft} className="space-y-6">
      {draftKey ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600"><p>{t("draftHelp")}</p><button type="button" className="min-h-11 underline" onClick={()=>{restoreFields.current=null;if(saveTimer.current)clearTimeout(saveTimer.current);try{sessionStorage.removeItem(draftKey);}catch{} formRef.current?.reset();setTradeTerms("");setShippingMethod("");setPurchasePurpose(defaultPurchaseProfile?.purchasePurpose ?? "");setSalesChannel(defaultPurchaseProfile?.salesChannel ?? "");}}>{t("clearDraft")}</button></div> : null}
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6" aria-labelledby="purchase-details-heading">
        <h2 id="purchase-details-heading" className="text-lg font-semibold">{tBuyer("purchaseDetails")}</h2>
        <p className="mt-2 text-sm text-zinc-600">{tBuyer("savedHelp")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2" htmlFor="purchase_purpose"><span className="text-sm text-zinc-600">{tBuyer("purchasePurpose")} *</span><select id="purchase_purpose" name="purchase_purpose" required value={purchasePurpose} onChange={event => setPurchasePurpose(event.target.value)} className={inputClassName}><option value="">{tBuyer("selectOption")}</option>{PURCHASE_PURPOSES.map(purpose => <option key={purpose} value={purpose}>{tBuyer(`purposes.${purpose}`)}</option>)}</select></label>
          {purchasePurpose === "other" ? <label className="block sm:col-span-2" htmlFor="purpose_other"><span className="text-sm text-zinc-600">{tBuyer("purposeOther")} *</span><input id="purpose_other" name="purpose_other" required defaultValue={defaultPurchaseProfile?.purposeOther ?? ""} maxLength={500} className={inputClassName}/></label> : null}
          <>
            <label className="block" htmlFor="sales_channel"><span className="text-sm text-zinc-600">{tBuyer("salesChannel")} *</span><select id="sales_channel" name="sales_channel" required value={salesChannel} onChange={event=>setSalesChannel(event.target.value)} className={inputClassName}><option value="">{tBuyer("selectOption")}</option>{SALES_CHANNELS.map(channel=><option key={channel} value={channel}>{tBuyer(`channels.${channel}`)}</option>)}</select></label>
            <label className="block" htmlFor="sales_country"><span className="text-sm text-zinc-600">{tBuyer("salesCountry")} *</span><select id="sales_country" name="sales_country" required defaultValue={defaultPurchaseProfile?.salesCountry ?? ""} className={inputClassName}><option value="">{tBuyer("selectOption")}</option>{SIGNUP_COUNTRIES.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
            <label className="block sm:col-span-2" htmlFor="sales_details"><span className="text-sm text-zinc-600">{tBuyer("salesDetails")} *</span><input id="sales_details" name="sales_details" required minLength={3} defaultValue={defaultPurchaseProfile?.salesDetails ?? ""} maxLength={500} aria-describedby="sales-details-hint" className={inputClassName}/><p id="sales-details-hint" className="mt-1 text-xs text-zinc-500">{tBuyer(salesChannel === "other" ? "otherDetailsHint" : "detailsHint")}</p></label>
          </>
        </div>
      </section>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">
                  {[item.productCode, item.sku].filter(Boolean).join(" · ")} ·{" "}
                  {showPrices && !item.priceOnRequest ? t("lineItem", { quantity: item.quantity, price: formatLocalePrice(item.unitPrice, locale, usdKrwRate) }) : t("quantityOnly", { quantity: item.quantity })}
                </p>
              </div>
              {showPrices && !item.priceOnRequest ? <p className="font-medium">{formatLocalePrice(item.lineTotal, locale, usdKrwRate)}</p> : null}
            </li>
          ))}
        </ul>
        {showPrices ? <div className="mt-4 flex justify-between border-t border-zinc-100 pt-4 text-sm font-semibold">
          <span>{t("referenceSubtotal")}</span>
          <span>{formatLocalePrice(cart.subtotal, locale, usdKrwRate)}</span>
        </div> : null}
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

      <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" name="confirm_details" required className="mt-1 h-5 w-5 shrink-0"/>{t("confirmDetails")}</label>
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
