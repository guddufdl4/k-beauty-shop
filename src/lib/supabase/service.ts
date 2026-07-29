import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseProjectUrl,
  getSupabaseServiceRoleKey,
  isOpaqueSupabaseSecretKey,
  isSupabaseConfigured,
} from "./config";

/**
 * Supabase opaque `sb_secret_` keys must not be sent as `Authorization: Bearer`
 * (Supabase parses that header as JWT and returns "Invalid JWT").
 * @supabase/supabase-js always adds Authorization; strip it for opaque keys.
 */
function createServiceRoleFetch(serviceKey: string): typeof fetch {
  const stripAuth = isOpaqueSupabaseSecretKey(serviceKey);

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (stripAuth) {
      headers.delete("Authorization");
    }

    return fetch(input, { ...init, headers });
  };
}

/** Anonymous read-only client for cached storefront queries (no cookies). */
export function createPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseProjectUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service role client — webhook 등 서버 전용 (RLS 우회) */
export function createServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseProjectUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createServiceRoleFetch(serviceKey) },
  });
}
