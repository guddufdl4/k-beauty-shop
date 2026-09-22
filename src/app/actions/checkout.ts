"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import {
  clearCart,
  getCart,
  createQuoteOrderFromCart,
  markOrderPaid,
} from "@/lib/cart";
import {
  escapeHtml,
  sendQuoteInquiryEmail,
} from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";
import { formatKRW } from "@/lib/utils";
import { verifyCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export type CheckoutState = {
  error?: string;
  success?: boolean;
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
  const t = await getTranslations("checkout");
  const locale = await getLocale();

  if (trimField(formData.get("spam_trap"))) {
    return { success: true };
  }

  const companyName = trimField(formData.get("company_name"));
  const contactName = trimField(formData.get("contact_name"));
  const email = trimField(formData.get("email"));
  const phone = trimField(formData.get("phone"));
  const country = trimField(formData.get("country"));
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
  if (cart.items.length === 0) {
    return { error: t("emptyCart") };
  }

  const totalUnits = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const brands = [...new Set(cart.items.map((item) => item.brand).filter(Boolean))];

  const lineText = cart.items
    .map(
      (item) =>
        `${item.sku} | ${item.brand} | ${item.name} | qty ${item.quantity} | ${formatKRW(item.unitPrice)} | ${formatKRW(item.lineTotal)}`,
    )
    .join("\n");

  const text = [
    "HMT Korea wholesale quote request",
    `Locale: ${locale}`,
    `Company: ${companyName}`,
    `Contact: ${contactName}`,
    `Email: ${email}`,
    `Phone: ${phone || "-"}`,
    `Country: ${country}`,
    `Consignee: ${consignee || "-"}`,
    `Notify party: ${notifyParty || "-"}`,
    `Shipping address: ${destination || "-"}`,
    `Trade terms: ${tradeTerms || "-"}${tradeTermsEtc ? ` (${tradeTermsEtc})` : ""}`,
    `Shipping method: ${shippingMethod || "-"}${shippingMethodEtc ? ` (${shippingMethodEtc})` : ""}`,
    `Notes: ${message || "-"}`,
    "",
    "Requested items:",
    lineText,
    "",
    `Reference subtotal (KRW): ${formatKRW(cart.subtotal)}`,
    `Total units: ${totalUnits}`,
  ].join("\n");

  const rows = cart.items
    .map(
      (item) => `<tr>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.sku)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.brand)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7">${escapeHtml(item.name)}</td>
        <td style="padding:8px;border:1px solid #e4e4e7;text-align:right">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #e4e4e7;text-align:right">${escapeHtml(formatKRW(item.unitPrice))}</td>
        <td style="padding:8px;border:1px solid #e4e4e7;text-align:right">${escapeHtml(formatKRW(item.lineTotal))}</td>
      </tr>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;color:#18181b">
    <h2>HMT Korea wholesale quote request</h2>
    <p>A buyer submitted product quantities from the storefront cart. This is not a paid order.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0"><strong>Company</strong></td><td>${escapeHtml(companyName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Contact</strong></td><td>${escapeHtml(contactName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Phone</strong></td><td>${escapeHtml(phone || "-")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Country</strong></td><td>${escapeHtml(country)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Consignee</strong></td><td>${escapeHtml(consignee || "-")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Notify party</strong></td><td>${escapeHtml(notifyParty || "-")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Shipping address</strong></td><td>${escapeHtml(destination || "-")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Trade terms</strong></td><td>${escapeHtml(tradeTerms || "-")}${tradeTermsEtc ? ` (${escapeHtml(tradeTermsEtc)})` : ""}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Shipping method</strong></td><td>${escapeHtml(shippingMethod || "-")}${shippingMethodEtc ? ` (${escapeHtml(shippingMethodEtc)})` : ""}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Locale</strong></td><td>${escapeHtml(locale)}</td></tr>
    </table>
    ${message ? `<p><strong>Notes</strong><br/>${escapeHtml(message).replaceAll("\n", "<br/>")}</p>` : ""}
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:left">SKU</th>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:left">Brand</th>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:left">Product</th>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:right">Qty</th>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:right">Unit (KRW)</th>
          <th style="padding:8px;border:1px solid #e4e4e7;text-align:right">Line (KRW)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Reference subtotal:</strong> ${escapeHtml(formatKRW(cart.subtotal))} · <strong>Total units:</strong> ${totalUnits}</p>
  </div>`;

  await createQuoteOrderFromCart(cart, {
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

  const service = createServiceClient();
  if (service) {
    const { error } = await service.from("wholesale_inquiries").insert({
      company_name: companyName,
      contact_name: contactName,
      country,
      email,
      whatsapp: phone || null,
      interested_brands: brands.join(", ").slice(0, MAX_FIELD) || "Cart quote",
      estimated_quantity: `${totalUnits} units`,
      message: [
        consignee ? `Consignee: ${consignee}` : "",
        notifyParty ? `Notify party: ${notifyParty}` : "",
        destination ? `Shipping address: ${destination}` : "",
        tradeTerms ? `Trade terms: ${tradeTerms}${tradeTermsEtc ? ` (${tradeTermsEtc})` : ""}` : "",
        shippingMethod
          ? `Shipping method: ${shippingMethod}${shippingMethodEtc ? ` (${shippingMethodEtc})` : ""}`
          : "",
        message,
        "",
        lineText,
        `Reference subtotal (KRW): ${formatKRW(cart.subtotal)}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, MAX_MESSAGE),
      locale,
    });

    if (error) {
      console.error("[quote] inquiry insert failed:", error.message);
    }
  }

  const sent = await sendQuoteInquiryEmail({
    subject: `[HMT Korea] Quote request · ${companyName} · ${cart.items.length} SKUs`,
    html,
    text,
    replyTo: email,
  });

  if (!sent.ok) {
    return {
      error: sent.error === "email_not_configured" ? t("emailNotConfigured") : t("emailSendFailed"),
    };
  }

  await clearCart();
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return { success: true };
}

export async function confirmOrderPayment(
  orderNumber: string,
  sessionId: string,
): Promise<void> {
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
