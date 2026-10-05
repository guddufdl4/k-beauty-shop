"use server";

import { maintenanceActionError } from "@/lib/maintenance-server";

import { hasBusinessApproval } from "@/lib/auth/business-approval";
import { SIGNUP_COUNTRIES } from "@/lib/auth/signup-fields";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  clearCart,
  getCart,
  createQuoteOrderFromCart,
  markOrderPaid,
  revalidateQuoteCart,
} from "@/lib/cart";
import {
  escapeHtml,
  isQuoteMailConfigured,
  sendQuoteInquiryEmail,
} from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { formatKRW } from "@/lib/utils";
import { verifyCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { cartMeetsMinOrderUsd, getUsdKrwRate, MIN_ORDER_USD } from "@/lib/currency";
import { getMoqStep, isValidMoqQuantity } from "@/lib/store/moq-quantity";
import { QUOTE_CONFIRM_HREF } from "@/lib/store/quote-list";

export type CheckoutState = {
  error?: string;
  success?: boolean;
  orderNumber?: string;
  emailSent?: boolean;
};

const MAX_FIELD = 500;
const MAX_MESSAGE = 5000;

function trimField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitQuoteRequest(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const maintenanceError = await maintenanceActionError();
  if (maintenanceError) return { error: maintenanceError };
  const t = await getTranslations("checkout");
  const locale = await getLocale();
  const session = await getSessionProfile();

  if (!session.user || !hasBusinessApproval(session.profile)) {
    return { error: t("loginRequired") };
  }

  if (trimField(formData.get("spam_trap"))) {
    return { success: true };
  }

  const companyName = trimField(formData.get("company_name")) || session.profile?.company_name || "";
  const contactName = trimField(formData.get("contact_name")) || session.profile?.full_name || "";
  const email = trimField(formData.get("email")) || session.user.email || "";
  const phone = trimField(formData.get("phone"));
  const countryCode = trimField(formData.get("country"));
  const country = SIGNUP_COUNTRIES.find((entry) => entry.code === countryCode)?.name ?? "";
  const consignee = trimField(formData.get("consignee"));
  const notifyParty = trimField(formData.get("notify_party"));
  const shippingAddress = trimField(formData.get("shipping_address"));
  const destination = shippingAddress || trimField(formData.get("destination"));
  const tradeTerms = trimField(formData.get("trade_terms"));
  const tradeTermsEtc = trimField(formData.get("trade_terms_etc"));
  const shippingMethod = trimField(formData.get("shipping_method"));
  const shippingMethodEtc = trimField(formData.get("shipping_method_etc"));
  const message = trimField(formData.get("message"));

  if (!companyName || companyName.length > MAX_FIELD) {
    return { error: t("companyRequired") };
  }
  if (!contactName || contactName.length > MAX_FIELD) {
    return { error: t("contactRequired") };
  }
  if (!email || !isValidEmail(email) || email.length > MAX_FIELD) {
    return { error: t("emailInvalid") };
  }
  if (!country || country.length > MAX_FIELD) {
    return { error: t("countryRequired") };
  }
  if (
    phone.length > MAX_FIELD ||
    destination.length > MAX_FIELD ||
    consignee.length > MAX_FIELD ||
    notifyParty.length > MAX_FIELD ||
    shippingAddress.length > MAX_FIELD ||
    tradeTerms.length > MAX_FIELD ||
    tradeTermsEtc.length > MAX_FIELD ||
    shippingMethod.length > MAX_FIELD ||
    shippingMethodEtc.length > MAX_FIELD
  ) {
    return { error: t("fieldTooLong") };
  }
  if (tradeTerms === "ETC" && !tradeTermsEtc) {
    return { error: t("tradeTermsEtcRequired") };
  }
  if (shippingMethod === "ETC" && !shippingMethodEtc) {
    return { error: t("shippingMethodEtcRequired") };
  }
  if (message.length > MAX_MESSAGE) {
    return { error: t("fieldTooLong") };
  }

  const cart = await getCart();
  const verified = await revalidateQuoteCart(cart);
  if (!verified) {
    return { error: t("emptyCart") };
  }

  const tCart = await getTranslations("cart");
  for (const item of verified.items) {
    const step = getMoqStep(item.moq);
    if (item.quantity < step) {
      return { error: tCart("errors.moqNotMet", { moq: step }) };
    }
    if (!isValidMoqQuantity(item.quantity, step)) {
      return { error: tCart("errors.moqMultiple", { moq: step }) };
    }
  }

  const usdKrwRate = await getUsdKrwRate();
  if (!cartMeetsMinOrderUsd(verified.subtotal, usdKrwRate)) {
    return { error: t("minOrderUsd", { amount: MIN_ORDER_USD }) };
  }

  const created = await createQuoteOrderFromCart(verified, {
    companyName,
    contactName,
    email,
    phone,
    country,
    destination,
    consignee,
    notifyParty,
    shippingAddress,
    tradeTerms,
    tradeTermsEtc,
    shippingMethod,
    shippingMethodEtc,
    notes: message,
  });

  if (!created.orderNumber) {
    return { error: tCart("errors.orderCreateFailed") };
  }

  const totalUnits = verified.items.reduce((sum, item) => sum + item.quantity, 0);
  const brands = [...new Set(verified.items.map((item) => item.brand).filter(Boolean))];
  const lineText = verified.items
    .map(
      (item) =>
        `${item.productCode || item.sku} | ${item.brand} | ${item.name} | qty ${item.quantity} | ${formatKRW(item.unitPrice)} | ${formatKRW(item.lineTotal)}`,
    )
    .join("\n");

  const service = createServiceClient();
  if (service) {
    const { error } = await service.from("wholesale_inquiries").insert({
      company_name: companyName,
      contact_name: contactName,
      country,
      email,
      whatsapp: phone || null,
      interested_brands: brands.join(", ").slice(0, MAX_FIELD) || "Quote list",
      estimated_quantity: `${totalUnits} units`,
      message: [message, "", lineText, `Reference subtotal (KRW): ${formatKRW(verified.subtotal)}`]
        .filter(Boolean)
        .join("\n")
        .slice(0, MAX_MESSAGE),
      locale,
    });
    if (error) {
      console.error("[quote] inquiry insert failed:", error.message);
    }
  }

  let emailSent = false;
  if (isQuoteMailConfigured()) {
    const rows = verified.items
      .map(
        (item) => `<tr>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.productCode || item.sku)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.brand)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.name)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7;text-align:right">${item.quantity}</td>
      </tr>`,
      )
      .join("");
    const sent = await sendQuoteInquiryEmail({
      subject: `[HMT Korea] Quote request · ${created.orderNumber} · ${companyName}`,
      html: `<div style="font-family:Arial,sans-serif"><h2>HMT Korea wholesale quote request</h2><p>${escapeHtml(created.orderNumber)}</p><table>${rows}</table></div>`,
      text: `HMT Korea wholesale quote request\n${created.orderNumber}\n${lineText}`,
      replyTo: email,
    });
    emailSent = sent.ok;
  }

  await clearCart();
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return redirect({
    href: `${QUOTE_CONFIRM_HREF}?n=${encodeURIComponent(created.orderNumber)}${emailSent ? "&mail=1" : ""}`,
    locale,
  });
}

export async function confirmOrderPayment(
  orderNumber: string,
  sessionId: string,
): Promise<void> {
  const maintenanceError = await maintenanceActionError();
  if (maintenanceError) throw new Error(maintenanceError);
  if (!isStripeConfigured() || !sessionId) {
    return;
  }

  const verification = await verifyCheckoutSession(sessionId);
  if (
    !verification.paid ||
    !verification.orderNumber ||
    verification.orderNumber !== orderNumber
  ) {
    return;
  }

  await markOrderPaid(orderNumber, {
    provider: "stripe",
    sessionId,
  });

  revalidatePath(`/orders/${orderNumber}`);
}
