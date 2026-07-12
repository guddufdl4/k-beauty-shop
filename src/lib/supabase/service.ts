import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";

/** Anonymous read-only client for cached storefront queries (no cookies). */
export function createPublicClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Service role client — webhook 등 서버 전용 (RLS 우회) */
export function createServiceClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
