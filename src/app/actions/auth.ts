
"use server";
import { asianCopy } from "@/lib/asia-copy";
import { validBusinessNumber } from "@/lib/auth/business-number";

import { maintenanceActionError } from "@/lib/maintenance-server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PRIVACY_POLICY_VERSION, TERMS_POLICY_VERSION } from "@/lib/auth/consent";
import { buildSignupConfirmEmail } from "@/lib/auth/confirm-email";
import { looksLikeEmail, parseSignupForm } from "@/lib/auth/signup-fields";
import { safeStorefrontReturnTo } from "@/lib/auth/return-to";
import { sendCustomerEmail } from "@/lib/email";
import { resolveAuthEmailBaseUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AuthState = { error?: string; success?: string };

const RESEND_COOKIE = "hmt_confirm_resend_at";
const RESEND_THROTTLE_MS = 60_000;

function signupMetadata(input: {
  phoneNumber: string;
  fullName: string;
  companyName: string;
  countryCode: string;
  preferredCurrency: string;
  locale: string;
}) {
  return {
    phone_number: input.phoneNumber,
    full_name: input.fullName,
    company_name: input.companyName,
    country_code: input.countryCode,
    preferred_currency: input.preferredCurrency,
    locale: input.locale,
    terms_accepted: "true",
    privacy_accepted: "true",
    terms_version: TERMS_POLICY_VERSION,
    privacy_version: PRIVACY_POLICY_VERSION,
  };
}

async function persistSignupProfile(
  userId: string,
  input: {
    email: string;
    fullName: string;
    companyName: string;
    countryCode: string;
    businessNumber?: string;
    preferredCurrency: string;
  },
) {
  const service = createServiceClient();
  if (!service) {
    return;
  }

  const acceptedAt = new Date().toISOString();
  const withConsent = {
    id: userId,
    email: input.email,
    full_name: input.fullName,
    company_name: input.companyName,
    country_code: input.countryCode,
    preferred_currency: input.preferredCurrency,
    role: "customer" as const,
    business_number: input.businessNumber || null,
    terms_accepted_at: acceptedAt,
    privacy_accepted_at: acceptedAt,
    terms_version: TERMS_POLICY_VERSION,
    privacy_version: PRIVACY_POLICY_VERSION,
  };

  const { error } = await service.from("profiles").upsert(withConsent, { onConflict: "id" });
  if (!error) {
    return;
  }

  const { error: fallbackError } = await service.from("profiles").upsert(
    {
      id: userId,
      email: input.email,
      full_name: input.fullName,
      company_name: input.companyName,
      country_code: input.countryCode,
      preferred_currency: input.preferredCurrency,
      role: "customer",
    },
    { onConflict: "id" },
  );
  if (fallbackError) {
    console.error("[auth] profile upsert after signup:", fallbackError.message);
  }
}

function confirmRedirectPath(locale: string, returnTo: string) {
  const nextPath = returnTo.startsWith("/") ? `/${locale}${returnTo === "/" ? "" : returnTo}` : `/${locale}/account`;
  return nextPath;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const maintenanceError = await maintenanceActionError();
  if (maintenanceError) return { error: maintenanceError };
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const businessNumber = String(formData.get("business_number") || "").trim();
  if (!validBusinessNumber(businessNumber)) return { error: asianCopy(locale)?.businessNumberError ?? (locale === "ko" ? "사업자 번호를 올바르게 입력해 주세요." : "Please enter a valid business registration number.") };
  const parsed = parseSignupForm(formData);

  if ("errorKey" in parsed) {
    return { error: t(parsed.errorKey) };
  }

  const returnTo = safeStorefrontReturnTo(String(formData.get("next") ?? ""), "/account");
  const metadata = { business_number: businessNumber, ...signupMetadata({
    phoneNumber: parsed.phoneNumber,    fullName: parsed.fullName,
    companyName: parsed.companyName,
    countryCode: parsed.countryCode,
    preferredCurrency: parsed.preferredCurrency,
    locale,
  }) };
  const siteUrl = resolveAuthEmailBaseUrl();
  const nextPath = confirmRedirectPath(locale, returnTo);
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const service = createServiceClient();

  if (service) {
    const { data, error } = await service.auth.admin.generateLink({
      type: "signup",
      email: parsed.email,
      password: parsed.password,
      options: {
        data: metadata,
        redirectTo,
      },
    });

    if (error) {
      return { error: error.message };
    }

    const userId = data.user?.id;
    if (userId) {
      await persistSignupProfile(userId, { ...parsed, businessNumber });
    }

    const hashedToken = data.properties?.hashed_token;
    const verifyType = data.properties?.verification_type || "signup";
    const confirmUrl = hashedToken
      ? `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verifyType)}&next=${encodeURIComponent(nextPath)}`
      : data.properties?.action_link;

    if (!confirmUrl) {
      return { error: t("confirmEmailFailed") };
    }

    const mail = buildSignupConfirmEmail({
      fullName: parsed.fullName,
      confirmUrl,
    });
    const sent = await sendCustomerEmail({
      to: parsed.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (!sent.ok) {
      return { error: t("confirmEmailFailed") };
    }

    return { success: t("signupSuccess") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: redirectTo,
      data: metadata,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: t("signupSuccessFallback") };
}

export async function resendSignupConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const maintenanceError = await maintenanceActionError();
  if (maintenanceError) return { error: maintenanceError };
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return { error: t("emailInvalid") };
  }

  const store = await cookies();
  const last = Number(store.get(RESEND_COOKIE)?.value ?? 0);
  if (last && Date.now() - last < RESEND_THROTTLE_MS) {
    return { error: t("resendThrottled") };
  }

  const locale = await getLocale();
  const returnTo = safeStorefrontReturnTo(String(formData.get("next") ?? ""), "/account");
  const siteUrl = resolveAuthEmailBaseUrl();
  const nextPath = confirmRedirectPath(locale, returnTo);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) {
    return { error: error.message };
  }

  store.set(RESEND_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
  });
  return { success: t("resendSuccess") };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeStorefrontReturnTo(String(formData.get("next") ?? ""), "/account");

  if (!identifier || !password) {
    return { error: t("emailPasswordRequired") };
  }

  let email = identifier;
  if (!looksLikeEmail(identifier)) {
    const service = createServiceClient();
    const { data } = service
      ? await service.from("profiles").select("email").ilike("username", identifier).maybeSingle()
      : { data: null };
    if (!data?.email) {
      return { error: t("invalidLogin") };
    }
    email = data.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/admin");
  return redirect({ href: returnTo, locale: await getLocale() });
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[auth] signOut failed:", error.message);
    throw new Error("Sign out failed");
  }

  const requestedLocale = await getLocale();
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/products");

  return redirect({ href: "/", locale });
}
