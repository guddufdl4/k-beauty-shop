import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Deduplicate supabase.auth.getUser() within a single RSC request. */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

export type SessionProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "customer" | "admin" | "wholesale";
};

async function fetchProfileByUserId(userId: string) {
  const supabase = await createClient();
  return supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();
}

async function fetchProfileWithServiceRole(userId: string) {
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { data: null, error: null };
  }

  return serviceClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();
}

export async function getSessionProfile(): Promise<{
  configured: boolean;
  user: { id: string; email?: string } | null;
  profile: SessionProfile | null;
  profileError: string | null;
}> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return {
      configured: false,
      user: null,
      profile: null,
      profileError: null,
    };
  }

  const user = await getAuthUser();

  if (!user) {
    return {
      configured: true,
      user: null,
      profile: null,
      profileError: null,
    };
  }

  const sessionUser = { id: user.id, email: user.email ?? undefined };

  const { data: profile, error: profileQueryError } = await fetchProfileByUserId(
    user.id
  );

  if (profile) {
    return {
      configured: true,
      user: sessionUser,
      profile: profile as SessionProfile,
      profileError: null,
    };
  }

  if (profileQueryError) {
    const { data: serviceProfile, error: serviceError } =
      await fetchProfileWithServiceRole(user.id);

    if (serviceProfile && !serviceError) {
      return {
        configured: true,
        user: sessionUser,
        profile: serviceProfile as SessionProfile,
        profileError: null,
      };
    }

    return {
      configured: true,
      user: sessionUser,
      profile: null,
      profileError: profileQueryError.message,
    };
  }

  const { data: serviceProfile } = await fetchProfileWithServiceRole(user.id);

  if (serviceProfile) {
    return {
      configured: true,
      user: sessionUser,
      profile: serviceProfile as SessionProfile,
      profileError: null,
    };
  }

  return {
    configured: true,
    user: sessionUser,
    profile: null,
    profileError: null,
  };
}

/** Supabase 연결 시 /admin — 로그인 + role=admin 필수 (데모 모드는 통과) */
export async function requireAdminSession(): Promise<void> {
  const { configured, user, profile } = await getSessionProfile();

  if (!configured) {
    return;
  }

  if (!user) {
    redirect("/en/login");
  }

  if (profile?.role !== "admin") {
    redirect("/en");
  }
}
