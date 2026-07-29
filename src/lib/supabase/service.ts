import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseProjectUrl,
  getSupabaseServiceRoleKey,
  isOpaqueSupabaseSecretKey,
  isSupabaseConfigured,
  toHttpHeaderValue,
} from "./config";

function buildFetchInit(init: RequestInit | undefined, headers: Headers): RequestInit {
  const requestInit: RequestInit & { duplex?: "half" } = {
    method: init?.method,
    body: init?.body,
    signal: init?.signal,
    credentials: init?.credentials,
    cache: init?.cache,
    redirect: init?.redirect,
    referrer: init?.referrer,
    referrerPolicy: init?.referrerPolicy,
    integrity: init?.integrity,
    keepalive: init?.keepalive,
    mode: init?.mode,
    headers,
  };

  const duplex = (init as RequestInit & { duplex?: "half" } | undefined)?.duplex;
  if (duplex) {
    requestInit.duplex = duplex;
  }

  return requestInit;
}

/**
 * Supabase opaque `sb_secret_` keys must not be sent as `Authorization: Bearer`
 * (Supabase parses that header as JWT and returns "Invalid JWT").
 * @supabase/supabase-js always adds Authorization; strip it for opaque keys.
 *
 * Also normalizes header values to Latin-1 — Fetch rejects Unicode (e.g. "Settings →"
 * copy-pasted into env vars) with "Cannot convert argument to a ByteString".
 */
function createServiceRoleFetch(serviceKey: string): typeof fetch {
  const stripAuth = isOpaqueSupabaseSecretKey(serviceKey);

  return async (input, init) => {
    const headers = new Headers();

    if (init?.headers) {
      const source = new Headers(init.headers);
      source.forEach((value, name) => {
        if (stripAuth && name.toLowerCase() === "authorization") {
          return;
        }

        headers.set(name, toHttpHeaderValue(value));
      });
    }

    return fetch(input, buildFetchInit(init, headers));
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
