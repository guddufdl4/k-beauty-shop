import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSanitizedSupabaseConfig } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  const supabaseResponse = response ?? NextResponse.next({ request });

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    return supabaseResponse;
  }

  const { url, anonKey } = config;

  const supabase = createServerClient(url, anonKey, {
    global: {
      headers: { apikey: anonKey },
      fetch: createSsrSupabaseFetch(anonKey),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
}
