import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSanitizedSupabaseConfig,
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

function sanitizeFetchInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") {
    return toHttpHeaderValue(input);
  }

  if (input instanceof URL) {
    const href = toHttpHeaderValue(input.href);
    return href === input.href ? input : new URL(href);
  }

  if (input instanceof Request) {
    const url = toHttpHeaderValue(input.url);
    if (url === input.url) {
      return input;
    }

    return new Request(url, input);
  }

  return input;
}

function mergeSanitizedHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  omitAuthorization: boolean,
): Headers {
  const headers = new Headers();

  const append = (name: string, value: string) => {
    const safeName = toHttpHeaderValue(name);
    const safeValue = toHttpHeaderValue(value);
    if (!safeName || !safeValue) {
      return;
    }

    if (omitAuthorization && safeName.toLowerCase() === "authorization") {
      return;
    }

    headers.set(safeName, safeValue);
  };

  if (input instanceof Request) {
    input.headers.forEach((value, name) => {
      append(name, value);
    });
  }

  if (init?.headers) {
    new Headers(init.headers).forEach((value, name) => {
      append(name, value);
    });
  }

  if (omitAuthorization) {
    headers.delete("authorization");
  }

  return headers;
}

/**
 * Supabase opaque `sb_secret_` keys must not be sent as `Authorization: Bearer`
 * (Supabase parses that header as JWT and returns "Invalid JWT").
 *
 * @supabase/supabase-js fetchWithAuth calls Headers.set(apikey, supabaseKey) before this runs;
 * createClient must receive ASCII-only keys from getSanitizedSupabaseConfig().
 */
function createSupabaseFetch(apiKey: string, omitAuthorization: boolean): typeof fetch {
  const safeApiKey = toHttpHeaderValue(apiKey);

  return async (input, init) => {
    const headers = mergeSanitizedHeaders(input, init, omitAuthorization);

    headers.set("apikey", safeApiKey);

    if (omitAuthorization) {
      headers.delete("authorization");
    } else if (!headers.has("authorization")) {
      headers.set("authorization", `Bearer ${safeApiKey}`);
    }

    const sanitizedInput = sanitizeFetchInput(input);
    const nextInit = buildFetchInit(init, headers);
    const url =
      typeof sanitizedInput === "string"
        ? sanitizedInput
        : sanitizedInput instanceof URL
          ? sanitizedInput.href
          : sanitizedInput.url;

    const requestInit: RequestInit & { duplex?: "half" } = {
      method: nextInit.method ?? (input instanceof Request ? input.method : "GET"),
      headers,
      body: nextInit.body,
      signal: nextInit.signal,
      credentials: nextInit.credentials,
      cache: nextInit.cache,
      redirect: nextInit.redirect,
      referrer: nextInit.referrer,
      referrerPolicy: nextInit.referrerPolicy,
      integrity: nextInit.integrity,
      keepalive: nextInit.keepalive,
      mode: nextInit.mode,
    };

    const duplex = (nextInit as RequestInit & { duplex?: "half" }).duplex;
    if (duplex) {
      requestInit.duplex = duplex;
    }

    return fetch(new Request(url, requestInit));
  };
}

/** Sanitized fetch for cookie-based SSR clients (@supabase/ssr). */
export function createSsrSupabaseFetch(apiKey: string): typeof fetch {
  return createSupabaseFetch(apiKey, isOpaqueSupabaseSecretKey(apiKey));
}

/** Anonymous read-only client for cached storefront queries (no cookies). */
export function createPublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    return null;
  }

  const { url, anonKey } = config;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { apikey: anonKey },
      fetch: createSupabaseFetch(anonKey, false),
    },
  });
}

/** Service role client — webhook 등 서버 전용 (RLS 우회) */
export function createServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    return null;
  }

  const { url, serviceKey } = config;
  const omitAuthorization = isOpaqueSupabaseSecretKey(serviceKey);

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { apikey: serviceKey },
      fetch: createSupabaseFetch(serviceKey, omitAuthorization),
    },
  });
}
