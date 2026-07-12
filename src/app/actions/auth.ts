"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("emailPasswordRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  return {
    success: t("signupSuccess"),
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const t = await getTranslations("auth");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("emailPasswordRequired") };
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
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  revalidatePath("/account");
  return redirect({ href: "/login", locale: await getLocale() });
}
