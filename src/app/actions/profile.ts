"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: string };

export async function updateProfileFullName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const t = await getTranslations("account");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName) {
    return { error: t("nicknameRequired") };
  }

  if (fullName.length > 50) {
    return { error: t("nicknameTooLong") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale: await getLocale() });
    return { error: t("loginRequiredError") };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { success: t("nicknameSaved") };
}
