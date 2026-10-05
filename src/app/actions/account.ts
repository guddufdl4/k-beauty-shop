"use server";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, createPublicClient } from "@/lib/supabase/service";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { parseSignupForm, looksLikeEmail } from "@/lib/auth/signup-fields";
import { maintenanceActionError } from "@/lib/maintenance-server";
export type AccountState = { error?: string; success?: string };

export async function changeAccountEmail(_state: AccountState, form: FormData): Promise<AccountState> {
  const t = await getTranslations("accountSettings");
  const blocked = await maintenanceActionError();
  if (blocked) return { error: blocked };
  const session = await getSessionProfile();
  if (!session.user?.email) return { error: t("loginRequired") };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!looksLikeEmail(email) || email.length > 200) return { error: (await getTranslations("auth"))("emailInvalid") };
  if (!password || password.length > 72) return { error: t("passwordInvalid") };
  const verifier = createPublicClient();
  if (!verifier) return { error: t("failed") };
  const verified = await verifier.auth.signInWithPassword({ email: session.user.email, password });
  if (verified.error || verified.data.user?.id !== session.user.id) return { error: t("passwordInvalid") };
  await verifier.auth.signOut({ scope: "local" });
  const result = await (await createClient()).auth.updateUser({ email });
  if (result.error) return { error: t("failed") };
  return { success: t("emailSent") };
}

export async function saveAccount(_state: AccountState, form: FormData): Promise<AccountState> {
  const t = await getTranslations("accountSettings");
  const blocked = await maintenanceActionError();
  if (blocked) return { error: blocked };
  const session = await getSessionProfile();
  if (!session.user) return { error: t("loginRequired") };
  // Reuse signup validation without modifying credentials or consent records.
  const check = new FormData();
  for (const key of ["full_name", "company_name", "country_code", "phone_country", "phone_number"]) check.set(key, String(form.get(key) ?? ""));
  check.set("email", session.user.email ?? "");
  check.set("password", "validation-only"); check.set("password_confirm", "validation-only");
  check.set("preferred_currency", "USD"); check.set("accept_terms", "on"); check.set("accept_privacy", "on");
  const parsed = parseSignupForm(check);
  if ("errorKey" in parsed) return { error: (await getTranslations("auth"))(parsed.errorKey) };
  const client = await createClient();
  const { error } = await client.from("profiles").update({ full_name: parsed.fullName, company_name: parsed.companyName, country_code: parsed.countryCode, phone: parsed.phoneNumber }).eq("id", session.user.id);
  if (error) return { error: t("failed") };
  revalidatePath("/", "layout");
  return { success: t("saved") };
}

export async function closeAccount(_state: AccountState, form: FormData): Promise<AccountState> {
  const t = await getTranslations("accountSettings");
  const blocked = await maintenanceActionError();
  if (blocked) return { error: blocked };
  const session = await getSessionProfile();
  if (!session.user?.email) return { error: t("loginRequired") };
  if (session.profile?.role === "admin") return { error: t("adminProtected") };
  if (form.get("confirm") !== "on") return { error: t("confirmRequired") };
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 72) return { error: t("passwordInvalid") };
  // Authenticate independently so a failed password cannot replace the current session.
  const verifier = createPublicClient();
  const service = createServiceClient();
  if (!verifier || !service) return { error: t("failed") };
  const verified = await verifier.auth.signInWithPassword({ email: session.user.email, password });
  if (verified.error || verified.data.user?.id !== session.user.id) return { error: t("passwordInvalid") };
  await verifier.auth.signOut({ scope: "local" });
  const { data: profile, error: profileError } = await service.from("profiles").select("role").eq("id", session.user.id).single();
  if (profileError || profile.role === "admin") return { error: t("adminProtected") };
  // Revoke price access even for existing JWTs before disabling authentication.
  const revoked = await service.from("profiles").update({ role: "customer" }).eq("id", session.user.id).eq("role", profile.role).select("id");
  if (revoked.error || !revoked.data?.length) return { error: t("failed") };
  const removed = await service.auth.admin.deleteUser(session.user.id, true);
  if (removed.error) {
    const restored = await service.from("profiles").update({ role: profile.role }).eq("id", session.user.id).eq("role", "customer");
    if (restored.error) console.error("[account-close] role restoration failed");
    return { error: t("failed") };
  }
  // Keep the referenced identity row and transaction records; remove profile contact fields.
  const anonymized = await service.from("profiles").update({ email: `withdrawn-${session.user.id}@invalid.example`, full_name: null, company_name: null, phone: null, country_code: null }).eq("id", session.user.id);
  if (anonymized.error) console.error("[account-close] profile cleanup requires attention");
  await (await createClient()).auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect({ href: "/login?closed=1", locale: await getLocale() });
  return {};
}
