import { NextResponse } from "next/server";
import { escapeHtml, sendQuoteInquiryEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 5000;

type WholesaleInquiryPayload = {
  company_name?: string;
  contact_name?: string;
  country?: string;
  email?: string;
  whatsapp?: string;
  interested_brands?: string;
  estimated_quantity?: string;
  message?: string;
  locale?: string;
  spam_trap?: string;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(body: WholesaleInquiryPayload) {
  const company_name = trim(body.company_name);
  const contact_name = trim(body.contact_name);
  const country = trim(body.country);
  const email = trim(body.email);
  const whatsapp = trim(body.whatsapp);
  const interested_brands = trim(body.interested_brands);
  const estimated_quantity = trim(body.estimated_quantity);
  const message = trim(body.message);
  const locale = trim(body.locale) || "en";
  const spam_trap = trim(body.spam_trap);

  if (!company_name) {
    return { error: "company_name_required" as const };
  }
  if (!contact_name) {
    return { error: "contact_name_required" as const };
  }
  if (!country) {
    return { error: "country_required" as const };
  }
  if (!email || !isValidEmail(email)) {
    return { error: "email_invalid" as const };
  }
  if (!interested_brands) {
    return { error: "interested_brands_required" as const };
  }
  if (!estimated_quantity) {
    return { error: "estimated_quantity_required" as const };
  }
  if (!message) {
    return { error: "message_required" as const };
  }

  const fields = [
    company_name,
    contact_name,
    country,
    email,
    whatsapp,
    interested_brands,
    estimated_quantity,
    locale,
  ];

  if (fields.some((value) => value.length > MAX_FIELD_LENGTH) || message.length > MAX_MESSAGE_LENGTH) {
    return { error: "field_too_long" as const };
  }

  return {
    data: {
      company_name,
      contact_name,
      country,
      email,
      whatsapp: whatsapp || null,
      interested_brands,
      estimated_quantity,
      message,
      locale,
      spam_trap: spam_trap || null,
    },
    isSpam: spam_trap.length > 0,
  };
}

export async function POST(request: Request) {
  let body: WholesaleInquiryPayload;

  try {
    body = (await request.json()) as WholesaleInquiryPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = validatePayload(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.isSpam) {
    return NextResponse.json({ success: true });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { error } = await service.from("wholesale_inquiries").insert(result.data);

  if (error) {
    console.error("[wholesale-inquiry] insert failed:", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const data = result.data;
  const text = [
    "HMT Korea wholesale inquiry",
    `Locale: ${data.locale}`,
    `Company: ${data.company_name}`,
    `Contact: ${data.contact_name}`,
    `Email: ${data.email}`,
    `WhatsApp: ${data.whatsapp || "-"}`,
    `Country: ${data.country}`,
    `Interested brands: ${data.interested_brands}`,
    `Estimated quantity: ${data.estimated_quantity}`,
    "",
    data.message,
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;color:#18181b">
    <h2>HMT Korea wholesale inquiry</h2>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0"><strong>Company</strong></td><td>${escapeHtml(data.company_name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Contact</strong></td><td>${escapeHtml(data.contact_name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>WhatsApp</strong></td><td>${escapeHtml(data.whatsapp || "-")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Country</strong></td><td>${escapeHtml(data.country)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Brands</strong></td><td>${escapeHtml(data.interested_brands)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Quantity</strong></td><td>${escapeHtml(data.estimated_quantity)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Locale</strong></td><td>${escapeHtml(data.locale)}</td></tr>
    </table>
    <p>${escapeHtml(data.message).replaceAll("\n", "<br/>")}</p>
  </div>`;

  const sent = await sendQuoteInquiryEmail({
    subject: `[HMT Korea] Wholesale inquiry · ${data.company_name}`,
    html,
    text,
    replyTo: data.email,
  });

  if (!sent.ok) {
    console.error("[wholesale-inquiry] email failed:", sent.error);
  }

  return NextResponse.json({ success: true });
}
