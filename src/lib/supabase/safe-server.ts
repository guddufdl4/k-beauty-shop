import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSanitizedSupabaseConfig, isSupabaseConfigured } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function createSafeClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();
  const { url, anonKey } = config;

  return createServerClient(url, anonKey, {
    global: {
      headers: { apikey: anonKey },
      fetch: createSsrSupabaseFetch(anonKey),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware refreshes sessions.
        }
      },
    },
  });
}
