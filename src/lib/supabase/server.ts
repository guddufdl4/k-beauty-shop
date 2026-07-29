import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSanitizedSupabaseConfig, isSupabaseConfigured } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase env vars contain non-ASCII characters. Re-paste values from Supabase Dashboard."
    );
  }

  const cookieStore = await cookies();
  const { url, anonKey } = config;

  return createSupabaseServerClient(url, anonKey, {
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
