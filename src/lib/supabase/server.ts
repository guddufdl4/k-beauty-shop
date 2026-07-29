import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseProjectUrl, isSupabaseConfigured } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();
  const url = getSupabaseProjectUrl()!;
  const anonKey = getSupabaseAnonKey()!;

  return createSupabaseServerClient(url, anonKey, {
    global: { fetch: createSsrSupabaseFetch(anonKey) },
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
