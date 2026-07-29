import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseProjectUrl, isSupabaseConfigured } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function createSafeClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const url = getSupabaseProjectUrl()!;
  const anonKey = getSupabaseAnonKey()!;

  return createServerClient(url, anonKey, {
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
