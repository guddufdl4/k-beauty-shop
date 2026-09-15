"use server";

import { revalidatePath } from "next/cache";
import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { buildSignupConfirmEmail } from "@/lib/auth/confirm-email";
import { looksLikeEmail, parseSignupForm } from "@/lib/auth/signup-fields";
import { sendCustomerEmail } from "@/lib/email";
import { resolveAuthEmailBaseUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AuthState = { error?: string; success?: string };

function signupMetadata(input: {
  fullName: string;
  companyName: string;
  countryCode: string;
  username: string;
  preferredCurrency: string;
  locale: string;
}) {
  return {
    full_name: input.fullName,
    company_name: input.companyName,
    country_code: input.countryCode,
    username: input.username,
    preferred_currency: input.preferredCurrency,
    locale: input.locale,
  };
}

async function usernameTaken(username: string): Promise<boolean> {
  const service = createServiceClient();
  if (!service) {
    return false;
  }

  const { data, error } = await service
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.id);
}

async function persistSignupProfile(
  userId: string,
  input: {
    email: string;
    fullName: string;
    companyName: string;
    countryCode: string;
    username: string;
    preferredCurrency: string;
  },
) {
  const service = createServiceClient();
  if (!service) {
    return;
  }

  const { error } = await service.from("profiles").upsert(
    {
      id: userId,
      email: input.email,
      full_name: input.fullName,
      company_name: input.companyName,
      country_code: input.countryCode,
      username: input.username,
      preferred_currency: input.preferredCurrency,
      role: "customer",
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[auth] profile upsert after signup:", error.message);
  }
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const parsed = parseSignupForm(formData);

  if ("errorKey" in parsed) {
    const errorKey = parsed.errorKey;
    return { error: t(errorKey) };
  }

  if (await usernameTaken(parsed.username)) {
    return { error: t("usernameTaken") };
  }

  const metadata = signupMetadata({
    fullName: parsed.fullName,
    companyName: parsed.companyName,
    countryCode: parsed.countryCode,
    username: parsed.username,
    preferredCurrency: parsed.preferredCurrency,
    locale,
  });
  const siteUrl = resolveAuthEmailBaseUrl();
  const nextPath = `/${locale}/account`;
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
      await persistSignupProfile(userId, parsed);
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

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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
  return redirect({ href: "/account", locale: await getLocale() });
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
