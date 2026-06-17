import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSafeClient } from "@/lib/supabase/safe-server";

export type SessionProfile = {
  id: string;
  email: string;
  role: "customer" | "admin" | "wholesale";
};

export async function getSessionProfile(): Promise<{
  configured: boolean;
  user: { id: string; email?: string } | null;
  profile: SessionProfile | null;
}> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return { configured: false, user: null, profile: null };
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return { configured: false, user: null, profile: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { configured: true, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    configured: true,
    user: { id: user.id, email: user.email },
    profile: profile as SessionProfile | null,
  };
}
