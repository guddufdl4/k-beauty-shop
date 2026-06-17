import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";

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
